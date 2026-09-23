import { randomUUID } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { verifyApiAdmin } from '@/lib/api-admin-auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { detectImageType, maxImageBytes } from '@/lib/image-validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteContext) {
  const actor = await verifyApiAdmin(['superadmin','admin'])
  if (!actor) return NextResponse.json({ error: 'Se requiere una cuenta autorizada.' }, { status: 401 })
  const { id } = await params
  const form = await request.formData()
  const file = form.get('file'), altText = String(form.get('altText') || '').trim(), makeCover = form.get('cover') === 'true'
  if (!(file instanceof File) || file.size < 1 || file.size > maxImageBytes || altText.length < 3 || altText.length > 180) return NextResponse.json({ error: 'Elige una imagen de máximo 3 MB y escribe una descripción alternativa.' }, { status: 400 })
  const bytes = new Uint8Array(await file.arrayBuffer()), detected = detectImageType(bytes)
  if (!detected || file.type !== detected.mime) return NextResponse.json({ error: 'El formato de imagen no coincide con el contenido del archivo.' }, { status: 415 })
  const userClient = await createSupabaseServerClient()
  const { data: property } = await userClient.from('properties').select('id').eq('id', id).maybeSingle()
  if (!property) return NextResponse.json({ error: 'No encontramos ese inmueble.' }, { status: 404 })
  const admin = createSupabaseAdminClient()
  const [{ count }, { data: existing }] = await Promise.all([admin.from('property_images').select('*', { count: 'exact', head: true }).eq('property_id', id), admin.from('property_images').select('sort_order').eq('property_id', id).order('sort_order', { ascending: false }).limit(1).maybeSingle()])
  if ((count ?? 0) >= 30) return NextResponse.json({ error: 'Este inmueble ya tiene el máximo de 30 fotografías.' }, { status: 409 })
  const path = `${id}/${randomUUID()}.${detected.extension}`
  const { error: uploadError } = await admin.storage.from('property-images').upload(path, bytes, { contentType: detected.mime, cacheControl: '31536000', upsert: false })
  if (uploadError) return NextResponse.json({ error: 'No se pudo almacenar la fotografía.' }, { status: 503 })
  const { data: image, error: insertError } = await admin.from('property_images').insert({ property_id: id, storage_path: path, alt_text: altText, sort_order: (existing?.sort_order ?? -1) + 1 }).select('id,storage_path,alt_text,sort_order,is_cover').single()
  if (insertError || !image) {
    await admin.storage.from('property-images').remove([path])
    return NextResponse.json({ error: 'No se pudo registrar la fotografía en la galería.' }, { status: 503 })
  }
  if (makeCover || !count) {
    const { error } = await admin.rpc('set_property_cover', { p_property_id: id, p_image_id: image.id })
    if (error) return NextResponse.json({ error: 'La imagen quedó guardada, pero no se pudo cambiar la portada. Inténtalo desde la galería.' }, { status: 201 })
    image.is_cover = true
  }
  await admin.from('audit_log').insert({ actor_id: actor.userId, action: 'UPLOAD', entity_type: 'property_image', entity_id: image.id })
  const url = admin.storage.from('property-images').getPublicUrl(path).data.publicUrl
  return NextResponse.json({ image: { ...image, url } }, { status: 201 })
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const actor = await verifyApiAdmin(['superadmin','admin'])
  if (!actor) return NextResponse.json({ error: 'Se requiere una cuenta autorizada.' }, { status: 401 })
  const { id } = await params
  const payload = await request.json().catch(() => null) as { action?: string; imageId?: string; order?: string[] } | null
  const admin = createSupabaseAdminClient()
  if (payload?.action === 'cover' && payload.imageId) {
    const { error } = await admin.rpc('set_property_cover', { p_property_id: id, p_image_id: payload.imageId })
    if (error) return NextResponse.json({ error: 'No se pudo cambiar la portada.' }, { status: 400 })
  } else if (payload?.action === 'reorder' && payload.order?.length) {
    const { data: rows } = await admin.from('property_images').select('id').eq('property_id', id)
    const ids = new Set((rows ?? []).map((row) => row.id))
    if (ids.size !== payload.order.length || payload.order.some((value) => !ids.has(value))) return NextResponse.json({ error: 'La galería cambió. Recarga la página.' }, { status: 409 })
    for (const [index, imageId] of payload.order.entries()) {
      const { error } = await admin.from('property_images').update({ sort_order: index }).eq('id', imageId).eq('property_id', id)
      if (error) return NextResponse.json({ error: 'No se pudo reordenar toda la galería.' }, { status: 503 })
    }
  } else return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 })
  await admin.from('audit_log').insert({ actor_id: actor.userId, action: payload.action === 'cover' ? 'SET_COVER' : 'REORDER', entity_type: 'property_gallery', entity_id: id })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const actor = await verifyApiAdmin(['superadmin','admin'])
  if (!actor) return NextResponse.json({ error: 'Se requiere una cuenta autorizada.' }, { status: 401 })
  const { id } = await params, imageId = new URL(request.url).searchParams.get('imageId')
  if (!imageId) return NextResponse.json({ error: 'Falta la imagen.' }, { status: 400 })
  const admin = createSupabaseAdminClient()
  const { data: image } = await admin.from('property_images').select('id,storage_path').eq('id', imageId).eq('property_id', id).maybeSingle()
  if (!image) return NextResponse.json({ error: 'No encontramos esa fotografía.' }, { status: 404 })
  const { error: deleteError } = await admin.from('property_images').delete().eq('id', imageId)
  if (deleteError) return NextResponse.json({ error: 'No se pudo quitar la imagen de la galería.' }, { status: 503 })
  const { error: storageError } = await admin.storage.from('property-images').remove([image.storage_path])
  await admin.from('audit_log').insert({ actor_id: actor.userId, action: 'DELETE', entity_type: 'property_image', entity_id: imageId })
  return NextResponse.json({ ok: true, cleanupPending: Boolean(storageError) })
}
