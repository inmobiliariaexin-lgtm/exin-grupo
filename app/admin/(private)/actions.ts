'use server'
import { randomUUID } from 'node:crypto'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Resend } from 'resend'
import { requireAdminContext } from '@/lib/admin-auth'
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
  if(status==='confirmed'&&current.client_email&&process.env.RESEND_API_KEY&&process.env.EMAIL_FROM){try{const resend=new Resend(process.env.RESEND_API_KEY);const sent=await resend.emails.send({from:process.env.EMAIL_FROM,to:current.client_email,subject:'Cita confirmada · EXIN Grupo',text:`Hola ${current.client_name},\n\nTu cita de ${current.appointment_type} con EXIN Grupo quedó confirmada para el ${new Date(current.starts_at).toLocaleString('es-CO',{timeZone:'America/Bogota'})}.\n\nSi necesitas hacer un cambio, responde a este correo.`});emailState=sent.error?'fallo':'enviado'}catch{emailState='fallo'}}
  revalidatePath('/admin/citas'); redirect(`/admin/citas?actualizada=1&email=${emailState}`)
}

export async function saveHomeContentAction(form: FormData) {
  const context = await requireAdminContext(['superadmin','admin','editor'])
  const parsed = z.object({ hero_title: z.string().trim().min(4).max(160), hero_subtitle: z.string().trim().min(4).max(400), hero_image: z.string().trim().min(1).max(500), credit_title: z.string().trim().min(4).max(160), seller_title: z.string().trim().min(4).max(160) }).safeParse(Object.fromEntries(['hero_title','hero_subtitle','hero_image','credit_title','seller_title'].map((key) => [key, form.get(key)])))
  if (!parsed.success) redirect('/admin/contenido?error=campos')
  const image = parsed.data.hero_image
  const storagePrefix = process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-media/` : ''
  if (!image.startsWith('/assets/') && (!storagePrefix || !image.startsWith(storagePrefix))) redirect('/admin/contenido?error=imagen')
  const { error } = await context.supabase.from('site_modules').upsert({ module_key: 'home', content: parsed.data, enabled: true, updated_by: context.profile.id, updated_at: new Date().toISOString() })
  if (error) redirect('/admin/contenido?error=guardar')
  await context.supabase.from('audit_log').insert({ actor_id: context.profile.id, action: 'EDIT', entity_type: 'site_module', entity_id: 'home' })
  revalidatePath('/'); redirect('/admin/contenido?guardado=1')
}

export async function setSiteModuleAction(form: FormData) {
  const context = await requireAdminContext(['superadmin','admin','editor'])
  const key = String(form.get('module_key') || ''), enabled = form.get('enabled') === 'on'
  if (!['featured_properties','credit','seller','allies','constructor','rent'].includes(key)) redirect('/admin/contenido?error=modulo')
  const { error } = await context.supabase.from('site_modules').upsert({ module_key: key, content: {}, enabled, updated_by: context.profile.id })
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

export async function savePublicContactSettingsAction(form: FormData) {
  const context = await requireAdminContext(managerRoles)
  const schema = z.object({
    phone: z.string().trim().max(32).regex(/^[0-9+().\s-]*$/),
    email: z.string().trim().max(254).refine((value) => !value || z.email().safeParse(value).success),
    whatsapp: z.string().trim().max(32).regex(/^[0-9+().\s-]*$/),
    instagram: z.string().trim().max(250),
    facebook: z.string().trim().max(250),
  })
  const parsed = schema.safeParse(Object.fromEntries(['phone','email','whatsapp','instagram','facebook'].map((key) => [key, form.get(key) ?? ''])))
  if (!parsed.success) redirect('/admin/configuracion?error=contacto')
  for (const key of ['instagram','facebook'] as const) {
    const value = parsed.data[key]
    if (value && !value.startsWith('https://')) redirect('/admin/configuracion?error=enlace')
  }
  for (const [key, value] of Object.entries(parsed.data)) {
    const { error } = await context.supabase.from('site_settings').upsert({ setting_key: key, value, is_public: true, updated_by: context.profile.id, updated_at: new Date().toISOString() })
    if (error) redirect('/admin/configuracion?error=guardar')
  }
  revalidatePath('/'); revalidatePath('/contacto'); redirect('/admin/configuracion?contactos=1')
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
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: name }, redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/login` })
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
