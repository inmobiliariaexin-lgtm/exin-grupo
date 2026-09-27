import { createHmac, randomUUID } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { Resend } from 'resend'
import { inquirySchema } from '@/lib/inquiry-schema'
import { getResendApiKey } from '@/lib/resend'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function clientAddress(request: NextRequest) {
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return 'unknown'
}

async function verifyTurnstile(token: string | undefined, remoteIp: string, expectedHostname: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret && process.env.NODE_ENV !== 'production') return { ok: true, unavailable: false }
  if (!secret) return { ok: false, unavailable: true }
  if (!token) return { ok: false, unavailable: false }
  const body = new URLSearchParams({ secret, response: token, remoteip: remoteIp })
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body, cache: 'no-store', signal: AbortSignal.timeout(5000) })
    const result = await response.json() as { success?: boolean; hostname?: string }
    return { ok: result.success === true && result.hostname === expectedHostname, unavailable: false }
  } catch { return { ok: false, unavailable: true } }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  const allowedOrigins = new Set<string>()
  try { if (process.env.NEXT_PUBLIC_SITE_URL) allowedOrigins.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin) } catch { /* invalid site URL is not trusted */ }
  if (process.env.VERCEL_URL && /^[a-z0-9.-]+$/i.test(process.env.VERCEL_URL)) allowedOrigins.add(`https://${process.env.VERCEL_URL}`)
  try { if (process.env.CLOUDFLARE_WORKER_URL) allowedOrigins.add(new URL(process.env.CLOUDFLARE_WORKER_URL).origin) } catch { /* invalid preview URLs are not trusted */ }
  if (process.env.NODE_ENV !== 'production') allowedOrigins.add(request.nextUrl.origin)
  let originUrl: URL | null = null
  try { if (origin) originUrl = new URL(origin) } catch { /* invalid origins are rejected */ }
  if (!originUrl || !allowedOrigins.has(originUrl.origin)) {
    return NextResponse.json({ error: 'No se pudo validar el origen de la solicitud.' }, { status: 403 })
  }
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 16_384) return NextResponse.json({ error: 'La solicitud supera el tamaño permitido.' }, { status: 413 })
  let raw: unknown
  try {
    const body = await request.text()
    if (new TextEncoder().encode(body).byteLength > 16_384) return NextResponse.json({ error: 'La solicitud supera el tamaño permitido.' }, { status: 413 })
    raw = JSON.parse(body)
  } catch { return NextResponse.json({ error: 'La solicitud no tiene un formato válido.' }, { status: 400 }) }
  const parsed = inquirySchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Revisa los campos del formulario e inténtalo nuevamente.' }, { status: 400 })
  const data = parsed.data
  if (data.companyWebsite) return NextResponse.json({ ok: true }, { status: 201 })
  if (!process.env.LEGAL_CONSENT_VERSION) return NextResponse.json({ error: 'El formulario aún no está habilitado. El aviso legal está pendiente de aprobación.' }, { status: 503 })
  if (!process.env.RATE_LIMIT_HMAC_SECRET || process.env.RATE_LIMIT_HMAC_SECRET.length < 32) return NextResponse.json({ error: 'El formulario aún no está habilitado. Falta completar la configuración de seguridad.' }, { status: 503 })
  const remoteIp = clientAddress(request)
  const captcha = await verifyTurnstile(data.turnstileToken, remoteIp, originUrl.hostname)
  if (captcha.unavailable) return NextResponse.json({ error: 'La verificación está temporalmente fuera de servicio. Escríbenos por WhatsApp o teléfono.' }, { status: 503 })
  if (!captcha.ok) return NextResponse.json({ error: 'Completa la verificación de seguridad e inténtalo otra vez. Si el problema continúa, escríbenos por WhatsApp.' }, { status: 400 })

  const admin = createSupabaseAdminClient()
  const ipDigest = createHmac('sha256', process.env.RATE_LIMIT_HMAC_SECRET).update(remoteIp).digest('hex')
  const { data: allowed, error: limitError } = await admin.rpc('reserve_submission_slot', { p_ip_digest: ipDigest, p_limit: 12, p_window_seconds: 3600 })
  if (limitError) return NextResponse.json({ error: 'El formulario no está disponible temporalmente.' }, { status: 503 })
  if (!allowed) return NextResponse.json({ error: 'Has enviado varias solicitudes recientemente. Intenta más tarde.' }, { status: 429 })

  const propertyId = data.propertyId || null
  if (propertyId) {
    const { data: property } = await admin.from('properties').select('id,verification_code').eq('id', propertyId).eq('status', 'published').maybeSingle()
    if (!property || (data.propertyCode && property.verification_code !== data.propertyCode)) return NextResponse.json({ error: 'El inmueble ya no está disponible. Actualiza la página e inténtalo de nuevo.' }, { status: 409 })
  }
  const inquiryId = randomUUID()
  let appointmentStart: string | null = null
  let appointmentType: string | null = null
  if (data.kind === 'appointment') {
    const [year, month, day] = data.appointmentDate.split('-').map(Number)
    const [hour, minute] = data.appointmentTime.split(':').map(Number)
    const calendarDate = new Date(Date.UTC(year, month - 1, day))
    if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day || hour > 23 || minute > 59) {
      return NextResponse.json({ error: 'La fecha y hora no son válidas.' }, { status: 400 })
    }
    const dateTime = new Date(`${data.appointmentDate}T${data.appointmentTime}:00-05:00`)
    if (!Number.isFinite(dateTime.valueOf()) || dateTime.getTime() <= Date.now() || dateTime.getTime() > Date.now() + 365 * 24 * 60 * 60 * 1000) return NextResponse.json({ error: 'La fecha preferida debe estar entre hoy y los próximos 12 meses.' }, { status: 400 })
    appointmentStart = dateTime.toISOString(); appointmentType = data.appointmentType
  }
  const { error: insertError } = await admin.rpc('create_public_inquiry', {
    p_id: inquiryId, p_kind: data.kind, p_full_name: data.fullName, p_phone: data.phone,
    p_email: data.email, p_message: data.message ?? null, p_property_id: propertyId,
    p_property_code: data.propertyCode ?? null, p_requested_financing: data.kind === 'credit' ? data.interest : null,
    p_property_type: data.kind === 'capture' ? data.propertyType : null,
    p_city: data.kind === 'capture' ? data.city : null,
    p_neighborhood: data.kind === 'capture' ? data.neighborhood ?? null : null,
    p_consent_version: process.env.LEGAL_CONSENT_VERSION,
    p_appointment_start: appointmentStart,
    p_appointment_type: appointmentType,
  })
  if (insertError) return NextResponse.json({ error: 'No se pudo guardar la solicitud. Inténtalo más tarde.' }, { status: 503 })

  let recipient = process.env.INQUIRY_NOTIFICATION_EMAIL
  const { data: setting } = await admin.from('private_settings').select('value').eq('setting_key', 'inquiry_notification_email').maybeSingle()
  if (setting?.value) recipient = setting.value
  let notificationSent = false
  const resendApiKey = getResendApiKey()
  if (recipient && resendApiKey && process.env.EMAIL_FROM) {
    try {
      const resend = new Resend(resendApiKey)
      const flowDetails = data.kind === 'credit'
        ? [`Interés en crédito: ${data.interest}`]
        : data.kind === 'capture'
          ? [`Tipo de inmueble que ofrece: ${data.propertyType}`, `Ciudad: ${data.city}`, data.neighborhood ? `Barrio o zona: ${data.neighborhood}` : null]
          : data.kind === 'appointment'
            ? [`Tipo de cita: ${data.appointmentType}`, `Fecha preferida: ${data.appointmentDate}`, `Hora preferida: ${data.appointmentTime}`]
            : []
      const details = [
        'Nueva solicitud recibida en el sitio de EXIN Grupo.',
        `Tipo: ${data.kind}`,
        `Referencia: ${inquiryId}`,
        `Nombre: ${data.fullName}`,
        `Teléfono: ${data.phone}`,
        `Correo: ${data.email}`,
        `Inmueble: ${data.propertyCode || 'No indicado'}`,
        data.message ? `Mensaje: ${data.message}` : null,
        ...flowDetails,
        'Consulta y gestiona esta solicitud desde el panel administrativo.',
      ].filter(Boolean).join('\n')
      const result = await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: recipient,
        subject: `Nueva solicitud ${data.kind} · EXIN Grupo`,
        text: details,
      })
      notificationSent = !result.error
    } catch { notificationSent = false }
  }
  let uploadToken: string | null = null
  const attachmentCount = data.kind === 'capture' ? Number(data.attachmentCount ?? 0) : 0
  if (attachmentCount > 0) {
    const expiry = Date.now() + 20 * 60 * 1000, tokenPayload = `${inquiryId}.${expiry}`
    const signature = createHmac('sha256', process.env.RATE_LIMIT_HMAC_SECRET).update(tokenPayload).digest('base64url')
    uploadToken = `${Buffer.from(tokenPayload).toString('base64url')}.${signature}`
  }
  return NextResponse.json({ ok: true, inquiryId, uploadToken, notificationSent }, { status: 201 })
}
