import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { detectImageType, maxImageBytes } from '@/lib/image-validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
type Context = { params: Promise<{ id: string }> }

function verifyToken(token: string, inquiryId: string) {
  const secret = process.env.RATE_LIMIT_HMAC_SECRET
  if (!secret) return false
  const [payloadEncoded, signatureEncoded] = token.split('.')
  if (!payloadEncoded || !signatureEncoded) return false
  try {
    const payload = Buffer.from(payloadEncoded, 'base64url').toString('utf8')
    const expected = createHmac('sha256', secret).update(payload).digest()
    const provided = Buffer.from(signatureEncoded, 'base64url')
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return false
    const [tokenInquiryId, expiresAt] = payload.split('.')
    return tokenInquiryId === inquiryId && Number(expiresAt) > Date.now() && Number(expiresAt) < Date.now() + 21 * 60 * 1000
  } catch { return false }
}

export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params, token = request.headers.get('x-exin-upload-token') || ''
  if (!verifyToken(token, id)) return NextResponse.json({ error: 'El enlace de carga caducó. Envía otra vez la solicitud.' }, { status: 401 })
  const form = await request.formData(), file = form.get('file')
  if (!(file instanceof File) || file.size < 1 || file.size > maxImageBytes) return NextResponse.json({ error: 'El archivo supera el tamaño permitido.' }, { status: 400 })
  const bytes = new Uint8Array(await file.arrayBuffer()), detected = detectImageType(bytes)
  if (!detected || file.type !== detected.mime) return NextResponse.json({ error: 'Solo se aceptan imágenes JPG, PNG, WebP o AVIF válidas.' }, { status: 415 })
  const admin = createSupabaseAdminClient()
  const [{ data: inquiry }, { count }] = await Promise.all([admin.from('inquiries').select('id,kind').eq('id',id).maybeSingle(), admin.from('inquiry_attachments').select('*',{count:'exact',head:true}).eq('inquiry_id',id)])
  if (!inquiry || inquiry.kind !== 'capture') return NextResponse.json({ error: 'No encontramos la solicitud de captación.' }, { status: 404 })
  if ((count ?? 0) >= 6) return NextResponse.json({ error: 'La solicitud ya tiene seis fotografías.' }, { status: 409 })
  const path = `${id}/${randomUUID()}.${detected.extension}`
  const { error: uploadError } = await admin.storage.from('intake-attachments').upload(path,bytes,{contentType:detected.mime,cacheControl:'3600',upsert:false})
  if (uploadError) return NextResponse.json({ error: 'No se pudo almacenar la fotografía.' }, { status: 503 })
  const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120) || `imagen.${detected.extension}`
  const { error } = await admin.from('inquiry_attachments').insert({ inquiry_id:id,storage_path:path,file_name:fileName,content_type:detected.mime,byte_size:file.size })
  if (error) { await admin.storage.from('intake-attachments').remove([path]); return NextResponse.json({ error: 'No se pudo registrar la fotografía.' }, { status: 503 }) }
  return NextResponse.json({ ok:true },{status:201})
}
