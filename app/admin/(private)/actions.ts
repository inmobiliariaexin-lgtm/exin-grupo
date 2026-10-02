'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Resend } from 'resend'
import { requireAdminContext } from '@/lib/admin-auth'
import { getResendApiKey } from '@/lib/resend'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { AppRole } from '@/lib/types'

const managerRoles: AppRole[] = ['superadmin', 'admin']
function cleanSlug(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
function optionalNumber(form: FormData, key: string) { const value = String(form.get(key) ?? '').trim(); return value ? Number(value) : null }

export async function signOutAction() {
  const context = await requireAdminContext()
  await context.supabase.auth.signOut()
  redirect('/admin/login')
}

export async function createPropertyAction(form: FormData) {
  const context = await requireAdminContext(managerRoles)
  const values = z.object({ code: z.string().trim().min(1).max(64), title: z.string().trim().min(3).max(180), operation: z.enum(['sale','rent']), type: z.string().trim().min(2).max(80), city: z.string().trim().min(2).max(100), neighborhood: z.string().trim().max(120).optional(), description: z.string().trim().max(5000).optional(), status: z.enum(['draft','published']) }).safeParse({ code: form.get('code'), title: form.get('title'), operation: form.get('operation'), type: form.get('type'), city: form.get('city'), neighborhood: form.get('neighborhood'), description: form.get('description'), status: form.get('status') })
  if (!values.success) redirect('/admin/propiedades?error=campos')
  const bedrooms = optionalNumber(form,'bedrooms'), bathrooms = optionalNumber(form,'bathrooms'), area = optionalNumber(form,'area'), price = optionalNumber(form,'price')
  const numericValid = [bedrooms,bathrooms,area,price].every((value) => value === null || Number.isFinite(value) && value >= 0)
  if (!numericValid) redirect('/admin/propiedades?error=numero')
  const value = values.data
  const slug = `${cleanSlug(value.title)}-${cleanSlug(value.code)}`
  const featured = form.get('featured') === 'on' && value.status === 'published'
  const { error } = await context.supabase.from('properties').insert({ verification_code: value.code, slug, title: value.title, operation: value.operation, property_type: value.type, city: value.city, neighborhood: value.neighborhood || null, description: value.description || null, bedrooms, bathrooms, area_m2: area, price, status: value.status, is_featured: featured, published_at: value.status === 'published' ? new Date().toISOString() : null, created_by: context.profile.id })
  if (error) redirect(`/admin/propiedades?error=${error.code === '23505' ? 'duplicado' : 'guardar'}`)
  await context.supabase.from('audit_log').insert({ actor_id: context.profile.id, action: value.status === 'published' ? 'PUBLISH' : 'CREATE', entity_type: 'property', entity_id: slug })
  revalidatePath('/'); revalidatePath('/propiedades'); redirect('/admin/propiedades?guardada=1')
}

export async function updatePropertyAction(form: FormData) {
  const context = await requireAdminContext(managerRoles)
  const id = String(form.get('id') || '')
  if (!z.uuid().safeParse(id).success) redirect('/admin/propiedades?error=campos')
  const values = z.object({
    title: z.string().trim().min(3).max(180),
    operation: z.enum(['sale', 'rent']),
    type: z.string().trim().min(2).max(80),
    city: z.string().trim().min(2).max(100),
    neighborhood: z.string().trim().max(120).optional(),
    description: z.string().trim().max(5000).optional(),
    seo_title: z.string().trim().max(160).optional(),
    seo_description: z.string().trim().max(320).optional(),
    status: z.enum(['draft', 'published', 'inactive', 'sold']),
  }).safeParse({
    title: form.get('title'),
    operation: form.get('operation'),
    type: form.get('type'),
    city: form.get('city'),
    neighborhood: form.get('neighborhood'),
    description: form.get('description'),
    seo_title: form.get('seo_title'),
    seo_description: form.get('seo_description'),
    status: form.get('status'),
  })
  if (!values.success) redirect(`/admin/propiedades/${id}/editar?error=campos`)

  const bedrooms = optionalNumber(form, 'bedrooms')
  const bathrooms = optionalNumber(form, 'bathrooms')
  const area = optionalNumber(form, 'area')
  const price = optionalNumber(form, 'price')
  const numericValid = [bedrooms, bathrooms, area, price].every((value) => value === null || Number.isFinite(value) && value >= 0)
    && (bedrooms === null || Number.isInteger(bedrooms))
    && (area === null || area > 0)
  if (!numericValid) redirect(`/admin/propiedades/${id}/editar?error=numero`)

  const { data: current } = await context.supabase.from('properties').select('slug,status,published_at').eq('id', id).maybeSingle()
  if (!current) redirect('/admin/propiedades?error=guardar')
  const value = values.data
  const { error } = await context.supabase.from('properties').update({
    title: value.title,
    operation: value.operation,
    property_type: value.type,
    city: value.city,
    neighborhood: value.neighborhood || null,
    description: value.description || null,
    seo_title: value.seo_title || null,
    seo_description: value.seo_description || null,
    bedrooms,
    bathrooms,
    area_m2: area,
    price,
    status: value.status,
    is_featured: value.status === 'published' && form.get('featured') === 'on',
    published_at: value.status !== 'published' ? null : current.status === 'published' ? current.published_at : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) redirect(`/admin/propiedades/${id}/editar?error=${error.code === 'P0001' ? 'destacadas' : 'guardar'}`)

  await context.supabase.from('audit_log').insert({ actor_id: context.profile.id, action: 'UPDATE', entity_type: 'property', entity_id: id })
  revalidatePath('/')
  revalidatePath('/propiedades')
  revalidatePath(`/propiedades/${current.slug}`)
  redirect('/admin/propiedades?actualizada=1')
}

export async function setPropertyStatusAction(form: FormData) {
  const context = await requireAdminContext(managerRoles)
  const id = String(form.get('id') || ''), status = String(form.get('status') || '')
  if (!z.uuid().safeParse(id).success || !['draft','published','inactive','sold'].includes(status)) redirect('/admin/propiedades?error=campos')
  const { error } = await context.supabase.from('properties').update({ status, published_at: status === 'published' ? new Date().toISOString() : null, is_featured: status === 'published' && form.get('featured') === 'on' }).eq('id', id)
  if (error) redirect(`/admin/propiedades?error=${error.code === 'P0001' ? 'destacadas' : 'guardar'}`)
  await context.supabase.from('audit_log').insert({ actor_id: context.profile.id, action: status === 'published' ? 'PUBLISH' : 'UNPUBLISH', entity_type: 'property', entity_id: id })
  revalidatePath('/'); revalidatePath('/propiedades'); redirect('/admin/propiedades?actualizada=1')
}

export async function updateInquiryAction(form: FormData) {
  const context = await requireAdminContext(['superadmin','admin','commercial','advisor'])
  const id = String(form.get('id') || ''), status = String(form.get('status') || ''), assigned = String(form.get('assigned') || '')
  if (!z.uuid().safeParse(id).success || !['new','contacted','follow_up','appointment','negotiation','closed'].includes(status)) redirect('/admin/leads?error=campos')
  const assignedTo = assigned && z.uuid().safeParse(assigned).success ? assigned : null
  const { error } = await context.supabase.from('inquiries').update({ status, assigned_to: assignedTo }).eq('id', id)
  if (error) redirect('/admin/leads?error=guardar')
  await context.supabase.from('audit_log').insert({ actor_id: context.profile.id, action: 'UPDATE', entity_type: 'inquiry', entity_id: id })
  revalidatePath('/admin/leads'); redirect('/admin/leads?actualizada=1')
}

function bogotaDate(date: FormDataEntryValue | null, time: FormDataEntryValue | null) {
  const value = `${String(date || '')}T${String(time || '')}:00-05:00`, parsed = new Date(value)
  return Number.isFinite(parsed.valueOf()) ? parsed : null
}

export async function createManualAppointmentAction(form: FormData) {
  const context = await requireAdminContext(['superadmin','admin','commercial'])
  const clientName = String(form.get('clientName')||'').trim(), phone = String(form.get('phone')||'').trim(), email = String(form.get('email')||'').trim().toLowerCase(), appointmentType = String(form.get('appointmentType')||''), advisor = String(form.get('advisor')||''), propertyId = String(form.get('propertyId')||'')
  const startsAt = bogotaDate(form.get('date'),form.get('time'))
  if (clientName.length < 2 || clientName.length > 120 || phone.length < 6 || phone.length > 32 || (email && !z.email().safeParse(email).success) || !['Visita a inmueble','Asesoría de crédito','Conversación comercial','Otro'].includes(appointmentType) || !startsAt || startsAt.getTime() < Date.now() || startsAt.getTime() > Date.now()+365*86400000 || (advisor && !z.uuid().safeParse(advisor).success) || (propertyId && !z.uuid().safeParse(propertyId).success)) redirect('/admin/citas?error=campos')
  const { error } = await context.supabase.from('appointments').insert({ client_name:clientName,client_phone:phone,client_email:email||null,appointment_type:appointmentType,starts_at:startsAt.toISOString(),ends_at:new Date(startsAt.getTime()+45*60000).toISOString(),advisor_id:advisor||null,property_id:propertyId||null,status:'requested' })
  if (error) redirect(`/admin/citas?error=${error.code === 'P0001' ? 'ocupada' : 'guardar'}`)
  await context.supabase.from('audit_log').insert({ actor_id:context.profile.id,action:'CREATE',entity_type:'appointment' })
  revalidatePath('/admin/citas'); redirect('/admin/citas?creada=1')
}

export async function updateAppointmentAction(form: FormData) {
  const context = await requireAdminContext(['superadmin','admin','commercial','advisor'])
  const id=String(form.get('id')||''), status=String(form.get('status')||''), advisor=String(form.get('advisor')||''), reason=String(form.get('reason')||'').trim()
  const allowed=['requested','confirmed','completed','cancelled','rescheduled']
  if(!z.uuid().safeParse(id).success||!allowed.includes(status)||reason.length>500||(advisor&&!z.uuid().safeParse(advisor).success))redirect('/admin/citas?error=campos')
  const {data:current}=await context.supabase.from('appointments').select('client_name,client_email,starts_at,appointment_type,status').eq('id',id).maybeSingle()
  if(!current)redirect('/admin/citas?error=guardar')
  const {error}=await context.supabase.from('appointments').update({status,advisor_id:advisor||null,cancellation_reason:status==='cancelled'?reason:null,updated_at:new Date().toISOString()}).eq('id',id)
  if(error)redirect(`/admin/citas?error=${error.code==='P0001'?'ocupada':'guardar'}`)
  await context.supabase.from('audit_log').insert({actor_id:context.profile.id,action:status==='confirmed'?'CONFIRM':'UPDATE',entity_type:'appointment',entity_id:id})
  let emailState='sin-correo'
  const resendApiKey = getResendApiKey()
  if(status==='confirmed'&&current.client_email&&resendApiKey&&process.env.EMAIL_FROM){try{const resend=new Resend(resendApiKey);const sent=await resend.emails.send({from:process.env.EMAIL_FROM,to:current.client_email,subject:'Cita confirmada · EXIN Grupo',text:`Hola ${current.client_name},\n\nTu cita de ${current.appointment_type} con EXIN Grupo quedó confirmada para el ${new Date(current.starts_at).toLocaleString('es-CO',{timeZone:'America/Bogota'})}.\n\nSi necesitas hacer un cambio, responde a este correo.`});emailState=sent.error?'fallo':'enviado'}catch{emailState='fallo'}}
  revalidatePath('/admin/citas'); redirect(`/admin/citas?actualizada=1&email=${emailState}`)
}

export async function saveHomeContentAction(form: FormData) {
  const context = await requireAdminContext(['superadmin','admin','editor'])
  const fields = {
    hero_eyebrow: z.string().trim().min(2).max(80),
    hero_title: z.string().trim().min(4).max(160),
    hero_subtitle: z.string().trim().min(4).max(400),
    hero_image: z.string().trim().min(1).max(500),
    promise_one: z.string().trim().min(2).max(80),
    promise_two: z.string().trim().min(2).max(80),
    promise_three: z.string().trim().min(2).max(80),
    featured_eyebrow: z.string().trim().min(2).max(100),
    featured_title: z.string().trim().min(2).max(100),
    featured_subtitle: z.string().trim().min(2).max(240),
    featured_button: z.string().trim().min(2).max(50),
    project_eyebrow: z.string().trim().min(2).max(100),
    project_title: z.string().trim().min(2).max(100),
    project_emphasis: z.string().trim().min(2).max(100),
    project_body: z.string().trim().min(2).max(300),
    project_button: z.string().trim().min(2).max(50),
    credit_eyebrow: z.string().trim().min(2).max(100),
    credit_title: z.string().trim().min(4).max(160),
    credit_body: z.string().trim().min(2).max(300),
    credit_button: z.string().trim().min(2).max(50),
    seller_eyebrow: z.string().trim().min(2).max(100),
    seller_title: z.string().trim().min(4).max(160),
    seller_body: z.string().trim().min(2).max(300),
    seller_link: z.string().trim().min(2).max(60),
    allies_heading: z.string().trim().min(2).max(100),
    allies_body: z.string().trim().min(2).max(300),
    allies_link: z.string().trim().min(2).max(60),
    allies_eyebrow: z.string().trim().min(2).max(100),
    allies_page_title: z.string().trim().min(2).max(160),
    allies_page_intro: z.string().trim().min(2).max(1000),
    allies_page_detail: z.string().trim().min(2).max(1000),
    about_eyebrow: z.string().trim().min(2).max(100),
    about_title: z.string().trim().min(2).max(160),
    about_intro: z.string().trim().min(2).max(1000),
    about_details: z.string().trim().min(2).max(2000),
    about_button: z.string().trim().min(2).max(60),
    sell_eyebrow: z.string().trim().min(2).max(100),
    sell_page_title: z.string().trim().min(2).max(160),
    sell_intro: z.string().trim().min(2).max(1000),
    sell_benefits: z.string().trim().min(2).max(600),
    sell_note: z.string().trim().min(2).max(1000),
    contact_eyebrow: z.string().trim().min(2).max(100),
    contact_title: z.string().trim().min(2).max(160),
    contact_intro: z.string().trim().min(2).max(1000),
    footer_tagline: z.string().trim().min(2).max(100),
  }
  const parsed = z.object(fields).safeParse(Object.fromEntries(Object.keys(fields).map((key) => [key, form.get(key)])))
  if (!parsed.success) redirect('/admin/contenido?error=campos')
  const image = parsed.data.hero_image
  const storagePrefix = process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-media/` : ''
  if (!image.startsWith('/assets/') && (!storagePrefix || !image.startsWith(storagePrefix))) redirect('/admin/contenido?error=imagen')
  const { error } = await context.supabase.from('site_modules').upsert({ module_key: 'home', content: parsed.data, enabled: true, updated_by: context.profile.id, updated_at: new Date().toISOString() })
  if (error) redirect('/admin/contenido?error=guardar')
  await context.supabase.from('audit_log').insert({ actor_id: context.profile.id, action: 'EDIT', entity_type: 'site_module', entity_id: 'home' })
  revalidatePath('/', 'layout'); revalidatePath('/vender'); revalidatePath('/nosotros'); revalidatePath('/contacto'); revalidatePath('/aliados'); redirect('/admin/contenido?guardado=1')
}

export async function saveCreditContentAction(form: FormData) {
  const context = await requireAdminContext(['superadmin','admin','editor'])
  const contentFields = z.object({
    title: z.string().trim().min(4).max(160),
    introduction: z.string().trim().min(4).max(600),
    disclaimer: z.string().trim().min(10).max(1000),
  }).safeParse({ title: form.get('title'), introduction: form.get('introduction'), disclaimer: form.get('disclaimer') })
  if (!contentFields.success) redirect('/admin/credito?error=campos')

  let rawBanks: unknown
  try { rawBanks = JSON.parse(String(form.get('banks') || '[]')) } catch { redirect('/admin/credito?error=bancos') }
  const bankSchema = z.array(z.object({
    id: z.string().trim().min(1).max(80),
    name: z.string().trim().max(100),
    description: z.string().trim().max(300),
    logoUrl: z.string().trim().max(500),
    websiteUrl: z.string().trim().max(500).refine((value) => !value || (z.url().safeParse(value).success && value.startsWith('https://'))),
    buttonLabel: z.string().trim().max(60),
    active: z.boolean(),
  })).max(20)
  const banksResult = bankSchema.safeParse(rawBanks)
  if (!banksResult.success) redirect('/admin/credito?error=bancos')
  const banks = banksResult.data.filter((bank) => bank.name.length > 0)
  if (banks.some((bank) => bank.active && bank.name.length < 2) || new Set(banks.map((bank) => bank.id)).size !== banks.length) redirect('/admin/credito?error=bancos')

  const storagePrefix = process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/site-media/` : ''
  const validImageUrl = (value: string) => !value || (value.startsWith('/assets/') && !value.startsWith('//') && !value.includes('..')) || (Boolean(storagePrefix) && value.startsWith(storagePrefix) && z.url().safeParse(value).success)
  if (banks.some((bank) => !validImageUrl(bank.logoUrl))) redirect('/admin/credito?error=imagen')

  const now = new Date().toISOString()
  const creditContent = { ...contentFields.data, banks }
  const { error } = await context.supabase.from('site_modules').upsert({ module_key: 'credit', content: creditContent, updated_by: context.profile.id, updated_at: now })
  if (error) redirect('/admin/credito?error=guardar')
  await context.supabase.from('audit_log').insert({ actor_id: context.profile.id, action: 'EDIT', entity_type: 'site_module', entity_id: 'credit' })
  revalidatePath('/credito'); revalidatePath('/admin/credito'); redirect('/admin/credito?guardado=1')
}

export async function saveTermsContentAction(form: FormData) {
  const context = await requireAdminContext(managerRoles)
  const parsed = z.object({ title: z.string().trim().min(4).max(160), body: z.string().trim().min(100).max(20_000) }).safeParse({ title: form.get('title'), body: form.get('body') })
  if (!parsed.success) redirect('/admin/legal?error=campos')
  const approved = form.get('approved') === 'on'
  const now = new Date().toISOString()
  const { error } = await context.supabase.from('site_modules').upsert({ module_key: 'terms', content: { ...parsed.data, approved, version: `v-${now.slice(0, 10)}`, updatedAt: now }, enabled: true, sort_order: 90, updated_by: context.profile.id, updated_at: now })
  if (error) redirect('/admin/legal?error=guardar')
  await context.supabase.from('audit_log').insert({ actor_id: context.profile.id, action: approved ? 'APPROVE' : 'EDIT', entity_type: 'site_module', entity_id: 'terms' })
  revalidatePath('/terminos'); revalidatePath('/admin/legal'); revalidatePath('/sitemap.xml')
  redirect('/admin/legal?guardado=1')
}

export async function setSiteModuleAction(form: FormData) {
  const context = await requireAdminContext(['superadmin','admin','editor'])
  const key = String(form.get('module_key') || ''), enabled = form.get('enabled') === 'on'
  if (!['featured_properties','credit','seller','allies','constructor','rent','project_cta'].includes(key)) redirect('/admin/contenido?error=modulo')
  const { data: existing, error: lookupError } = await context.supabase.from('site_modules').select('module_key').eq('module_key', key).maybeSingle()
  if (lookupError) redirect('/admin/contenido?error=guardar')
  const update = existing
    ? await context.supabase.from('site_modules').update({ enabled, updated_by: context.profile.id, updated_at: new Date().toISOString() }).eq('module_key', key)
    : await context.supabase.from('site_modules').insert({ module_key: key, content: {}, enabled, updated_by: context.profile.id })
  const { error } = update
  if (error) redirect('/admin/contenido?error=guardar')
  revalidatePath('/', 'layout')
  if (key === 'credit') revalidatePath('/credito')
  if (key === 'seller') revalidatePath('/vender')
  if (key === 'allies') revalidatePath('/aliados')
  if (key === 'rent') revalidatePath('/propiedades')
  redirect('/admin/contenido?guardado=1')
}

export async function saveNotificationEmailAction(form: FormData) {
  const context = await requireAdminContext(managerRoles)
  const email = String(form.get('email') || '').trim().toLowerCase()
  if (email && !z.email().safeParse(email).success) redirect('/admin/configuracion?error=correo')
  if (email) {
    const { error } = await context.supabase.from('private_settings').upsert({ setting_key: 'inquiry_notification_email', value: email, updated_by: context.profile.id, updated_at: new Date().toISOString() })
    if (error) redirect('/admin/configuracion?error=guardar')
  } else {
    const { error } = await context.supabase.from('private_settings').delete().eq('setting_key', 'inquiry_notification_email')
    if (error) redirect('/admin/configuracion?error=guardar')
  }
  await context.supabase.from('audit_log').insert({ actor_id: context.profile.id, action: 'EDIT', entity_type: 'private_setting', entity_id: 'inquiry_notification_email' })
  redirect('/admin/configuracion?guardado=1')
}

export async function sendTestNotificationEmailAction() {
  const context = await requireAdminContext(managerRoles)
  const { data: setting, error: settingError } = await context.supabase.from('private_settings').select('value').eq('setting_key', 'inquiry_notification_email').maybeSingle()
  if (settingError) redirect('/admin/configuracion?prueba=fallo')
  const recipient = setting?.value || process.env.INQUIRY_NOTIFICATION_EMAIL || ''
  if (!recipient) redirect('/admin/configuracion?prueba=sin-destino')
  const apiKey = getResendApiKey()
  if (!apiKey) redirect('/admin/configuracion?prueba=sin-clave')
  const sender = process.env.EMAIL_FROM?.trim()
  if (!sender) redirect('/admin/configuracion?prueba=sin-remitente')
  let sendState: 'aceptado' | 'rechazado' | 'fallo' = 'fallo'
  try {
    const resend = new Resend(apiKey)
    const result = await resend.emails.send({
      from: sender,
      to: recipient,
      subject: 'Prueba de correo · EXIN Grupo',
      text: 'Este es un mensaje de prueba de las notificaciones del sitio EXIN Grupo. Si lo recibiste, Resend aceptó el envío al correo configurado.',
    })
    sendState = result.error ? 'rechazado' : 'aceptado'
  } catch { sendState = 'fallo' }
  redirect(`/admin/configuracion?prueba=${sendState}`)
}

export async function savePublicContactSettingsAction(form: FormData) {
  const context = await requireAdminContext(managerRoles)
  const schema = z.object({
    phone: z.string().trim().max(32).regex(/^[0-9+().\s-]*$/),
    email: z.string().trim().max(254).refine((value) => !value || z.email().safeParse(value).success),
    whatsapp: z.string().trim().max(32).regex(/^[0-9+().\s-]*$/),
    instagram: z.string().trim().max(250),
    facebook: z.string().trim().max(250),
    youtube: z.string().trim().max(250),
    tiktok: z.string().trim().max(250),
    linkedin: z.string().trim().max(250),
  })
  const socialKeys = ['instagram','facebook','youtube','tiktok','linkedin'] as const
  const parsed = schema.safeParse(Object.fromEntries(['phone','email','whatsapp',...socialKeys].map((key) => [key, form.get(key) ?? ''])))
  if (!parsed.success) redirect('/admin/configuracion?error=contacto')
  for (const key of socialKeys) {
    const value = parsed.data[key]
    if (value && (!z.url().safeParse(value).success || !value.startsWith('https://'))) redirect('/admin/configuracion?error=enlace')
  }
  for (const [key, value] of Object.entries(parsed.data)) {
    const { error } = await context.supabase.from('site_settings').upsert({ setting_key: key, value, is_public: true, updated_by: context.profile.id, updated_at: new Date().toISOString() })
    if (error) redirect('/admin/configuracion?error=guardar')
  }
  revalidatePath('/', 'layout'); redirect('/admin/configuracion?contactos=1')
}

export async function createLocationAction(form: FormData) {
  const context = await requireAdminContext(managerRoles)
  const city = String(form.get('city') || '').trim(), department = String(form.get('department') || '').trim()
  if (city.length < 2 || city.length > 100 || department.length > 100) redirect('/admin/ubicaciones?error=campos')
  const { error } = await context.supabase.from('locations').insert({ city, department: department || null, country: 'Colombia' })
  if (error) redirect(`/admin/ubicaciones?error=${error.code === '23505' ? 'duplicada' : 'guardar'}`)
  revalidatePath('/'); revalidatePath('/propiedades'); redirect('/admin/ubicaciones?guardado=1')
}

export async function createPropertyTypeAction(form: FormData) {
  const context = await requireAdminContext(managerRoles)
  const name = String(form.get('name') || '').trim()
  if (name.length < 2 || name.length > 80) redirect('/admin/ubicaciones?error=campos')
  const { error } = await context.supabase.from('property_types').insert({ name })
  if (error) redirect(`/admin/ubicaciones?error=${error.code === '23505' ? 'duplicado' : 'guardar'}`)
  revalidatePath('/'); revalidatePath('/propiedades'); redirect('/admin/ubicaciones?guardado=1')
}

export async function setLocationActiveAction(form: FormData) {
  const context = await requireAdminContext(managerRoles)
  const id = String(form.get('id') || ''), active = form.get('active') === 'true'
  if (!z.uuid().safeParse(id).success) redirect('/admin/ubicaciones?error=campos')
  const { error } = await context.supabase.from('locations').update({ active }).eq('id', id)
  if (error) redirect('/admin/ubicaciones?error=guardar')
  revalidatePath('/'); revalidatePath('/propiedades'); redirect('/admin/ubicaciones?actualizado=1')
}

export async function setPropertyTypeActiveAction(form: FormData) {
  const context = await requireAdminContext(managerRoles)
  const id = String(form.get('id') || ''), active = form.get('active') === 'true'
  if (!z.uuid().safeParse(id).success) redirect('/admin/ubicaciones?error=campos')
  const { error } = await context.supabase.from('property_types').update({ active }).eq('id', id)
  if (error) redirect('/admin/ubicaciones?error=guardar')
  revalidatePath('/'); revalidatePath('/propiedades'); redirect('/admin/ubicaciones?actualizado=1')
}

export async function inviteAdminUserAction(form: FormData) {
  const context = await requireAdminContext(['superadmin'])
  const email = String(form.get('email') || '').trim().toLowerCase(), name = String(form.get('name') || '').trim(), role = String(form.get('role') || '') as AppRole
  const roles: AppRole[] = ['admin','commercial','advisor','editor']
  if (!z.email().safeParse(email).success || name.length < 2 || name.length > 120 || !roles.includes(role)) redirect('/admin/usuarios?error=campos')
  const admin = createSupabaseAdminClient()
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://inmobiliariagrupoexin.com').replace(/\/$/, '')
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: name }, redirectTo: `${siteUrl}/admin/recuperar-contrasena/callback` })
  if (error || !data.user) redirect('/admin/usuarios?error=invitacion')
  const { error: roleError } = await context.supabase.from('profiles').update({ full_name: name, role }).eq('id', data.user.id)
  if (roleError) redirect('/admin/usuarios?error=rol')
  await context.supabase.from('audit_log').insert({ actor_id: context.profile.id, action: 'CREATE_USER', entity_type: 'profile', entity_id: data.user.id, details: { role } })
  revalidatePath('/admin/usuarios'); redirect('/admin/usuarios?invitado=1')
}

export async function setUserActiveAction(form: FormData) {
  const context = await requireAdminContext(['superadmin'])
  const id = String(form.get('id') || ''), active = form.get('active') === 'true'
  if (!z.uuid().safeParse(id).success || id === context.profile.id) redirect('/admin/usuarios?error=usuario')
  const { error } = await context.supabase.from('profiles').update({ active }).eq('id', id)
  if (error) redirect('/admin/usuarios?error=guardar')
  await context.supabase.from('audit_log').insert({ actor_id: context.profile.id, action: active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER', entity_type: 'profile', entity_id: id })
  revalidatePath('/admin/usuarios'); redirect('/admin/usuarios?actualizado=1')
}

function hasDeleteConfirmation(form: FormData) {
  return String(form.get('confirmation') || '').trim().toUpperCase() === 'ELIMINAR'
}

export async function deleteAdminUserAction(form: FormData) {
  const context = await requireAdminContext(['superadmin'])
  const id = String(form.get('id') || '')
  if (!z.uuid().safeParse(id).success || id === context.profile.id || !hasDeleteConfirmation(form)) redirect('/admin/usuarios?error=confirmacion')

  const admin = createSupabaseAdminClient()
  const [{ data: target }, { data: activeSuperadmins, error: superadminError }] = await Promise.all([
    admin.from('profiles').select('id,role').eq('id', id).maybeSingle(),
    admin.from('profiles').select('id').eq('role', 'superadmin').eq('active', true),
  ])
  if (!target) redirect('/admin/usuarios?error=usuario')
  if (superadminError) redirect('/admin/usuarios?error=borrar')
  if (target.role === 'superadmin' && (activeSuperadmins?.length ?? 0) <= 1) redirect('/admin/usuarios?error=ultimo_superadmin')

  const { error: auditError } = await admin.from('audit_log').update({ entity_id: null, details: {} }).eq('entity_type', 'profile').eq('entity_id', id)
  if (auditError) redirect('/admin/usuarios?error=borrar')
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) redirect('/admin/usuarios?error=borrar')

  await context.supabase.from('audit_log').insert({ actor_id: context.profile.id, action: 'DELETE_USER', entity_type: 'profile', entity_id: null, details: { role: target.role } })
  revalidatePath('/admin/usuarios'); revalidatePath('/admin/leads'); revalidatePath('/admin/citas')
  redirect('/admin/usuarios?eliminado=1')
}

export async function deleteInquiryDataAction(form: FormData) {
  const context = await requireAdminContext(managerRoles)
  const id = String(form.get('id') || '')
  if (!z.uuid().safeParse(id).success || !hasDeleteConfirmation(form)) redirect('/admin/leads?error=confirmacion')

  const admin = createSupabaseAdminClient()
  const [{ data: inquiry }, { data: attachments, error: attachmentError }] = await Promise.all([
    admin.from('inquiries').select('id').eq('id', id).maybeSingle(),
    admin.from('inquiry_attachments').select('storage_path').eq('inquiry_id', id),
  ])
  if (!inquiry) redirect('/admin/leads?error=no_encontrada')
  if (attachmentError) redirect('/admin/leads?error=borrar')

  const paths = (attachments ?? []).map((attachment) => attachment.storage_path)
  const { error: storageError } = paths.length
    ? await admin.storage.from('intake-attachments').remove(paths)
    : { error: null }
  if (storageError) redirect('/admin/leads?error=archivos')
  const { error: auditError } = await admin.from('audit_log').update({ entity_id: null, details: {} }).eq('entity_type', 'inquiry').eq('entity_id', id)
  if (auditError) redirect('/admin/leads?error=borrar')
  const { error } = await admin.from('inquiries').delete().eq('id', id)
  if (error) redirect('/admin/leads?error=borrar')

  await context.supabase.from('audit_log').insert({ actor_id: context.profile.id, action: 'DELETE_PERSONAL_DATA', entity_type: 'inquiry', entity_id: null })
  revalidatePath('/admin/leads'); revalidatePath('/admin/citas')
  redirect('/admin/leads?eliminado=1')
}

export async function deleteAppointmentAction(form: FormData) {
  const context = await requireAdminContext(managerRoles)
  const id = String(form.get('id') || '')
  if (!z.uuid().safeParse(id).success || !hasDeleteConfirmation(form)) redirect('/admin/citas?error=confirmacion')

  const admin = createSupabaseAdminClient()
  const { error: auditError } = await admin.from('audit_log').update({ entity_id: null, details: {} }).eq('entity_type', 'appointment').eq('entity_id', id)
  if (auditError) redirect('/admin/citas?error=borrar')
  const { error } = await admin.from('appointments').delete().eq('id', id)
  if (error) redirect('/admin/citas?error=borrar')
  await context.supabase.from('audit_log').insert({ actor_id: context.profile.id, action: 'DELETE_APPOINTMENT', entity_type: 'appointment', entity_id: null })
  revalidatePath('/admin/citas')
  redirect('/admin/citas?eliminada=1')
}

export async function deletePropertyAction(form: FormData) {
  const context = await requireAdminContext(managerRoles)
  const id = String(form.get('id') || '')
  if (!z.uuid().safeParse(id).success || !hasDeleteConfirmation(form)) redirect('/admin/propiedades?error=confirmacion')

  const admin = createSupabaseAdminClient()
  const [{ data: property }, { data: images, error: imagesError }] = await Promise.all([
    admin.from('properties').select('id,slug').eq('id', id).maybeSingle(),
    admin.from('property_images').select('storage_path').eq('property_id', id),
  ])
  if (!property) redirect('/admin/propiedades?error=no_encontrado')
  if (imagesError) redirect('/admin/propiedades?error=borrar')

  const paths = (images ?? []).map((image) => image.storage_path)
  const { error: storageError } = paths.length
    ? await admin.storage.from('property-images').remove(paths)
    : { error: null }
  if (storageError) redirect('/admin/propiedades?error=archivos')
  const { error } = await admin.from('properties').delete().eq('id', id)
  if (error) redirect('/admin/propiedades?error=borrar')

  await context.supabase.from('audit_log').insert({ actor_id: context.profile.id, action: 'DELETE_PROPERTY', entity_type: 'property', entity_id: property.slug })
  revalidatePath('/'); revalidatePath('/propiedades'); revalidatePath('/propiedades/[slug]', 'page'); revalidatePath('/admin/propiedades')
  redirect('/admin/propiedades?eliminada=1')
}
