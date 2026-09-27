import { randomUUID } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { verifyApiAdmin } from '@/lib/api-admin-auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { detectImageType, maxImageBytes } from '@/lib/image-validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (!await verifyApiAdmin(['superadmin','admin','editor'])) return NextResponse.json({ error: 'Se requiere una cuenta autorizada.' }, { status: 401 })
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('media_assets').select('id,public_url,file_name,alt_text,content_type,created_at').order('created_at', { ascending: false }).limit(100)
  if (error) return NextResponse.json({ error: 'No se pudo consultar la biblioteca.' }, { status: 503 })
  return NextResponse.json({ assets: data ?? [] })
}

export async function POST(request: NextRequest) {
  const actor = await verifyApiAdmin(['superadmin','admin','editor'])
  if (!actor) return NextResponse.json({ error: 'Se requiere una cuenta autorizada.' }, { status: 401 })
  const form = await request.formData(), file = form.get('file'), altText = String(form.get('altText') || '').trim()
  if (!(file instanceof File) || file.size < 1 || file.size > maxImageBytes || altText.length < 3 || altText.length > 180) return NextResponse.json({ error: 'La imagen debe pesar máximo 3 MB y tener un texto alternativo.' }, { status: 400 })
  const bytes = new Uint8Array(await file.arrayBuffer()), detected = detectImageType(bytes)
  if (!detected || file.type !== detected.mime) return NextResponse.json({ error: 'El tipo declarado no coincide con el contenido de la imagen.' }, { status: 415 })
  const admin = createSupabaseAdminClient(), path = `site/${randomUUID()}.${detected.extension}`
  const { error: uploadError } = await admin.storage.from('site-media').upload(path, bytes, { contentType: detected.mime, cacheControl: '31536000', upsert: false })
  if (uploadError) return NextResponse.json({ error: 'No se pudo guardar el archivo en Supabase Storage.' }, { status: 503 })
  const publicUrl = admin.storage.from('site-media').getPublicUrl(path).data.publicUrl
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || `imagen.${detected.extension}`
  const { data, error } = await admin.from('media_assets').insert({ storage_path: path, public_url: publicUrl, file_name: safeName, alt_text: altText, content_type: detected.mime, created_by: actor.userId }).select('id,public_url,file_name,alt_text,content_type,created_at').single()
  if (error || !data) {
    await admin.storage.from('site-media').remove([path])
    return NextResponse.json({ error: 'No se pudo indexar el archivo en la biblioteca.' }, { status: 503 })
  }
  await admin.from('audit_log').insert({ actor_id: actor.userId, action: 'UPLOAD', entity_type: 'media_asset', entity_id: data.id })
  return NextResponse.json({ asset: data }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const actor = await verifyApiAdmin(['superadmin', 'admin'])
  if (!actor) return NextResponse.json({ error: 'Se requiere una cuenta administradora.' }, { status: 401 })
  const id = new URL(request.url).searchParams.get('id')
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: 'La imagen no es válida.' }, { status: 400 })

  const admin = createSupabaseAdminClient()
  const { data: asset, error: lookupError } = await admin.from('media_assets').select('id,storage_path').eq('id', id).maybeSingle()
  if (lookupError) return NextResponse.json({ error: 'No se pudo consultar la imagen.' }, { status: 503 })
  if (!asset) return NextResponse.json({ error: 'No encontramos esa imagen.' }, { status: 404 })

  const { error: storageError } = await admin.storage.from('site-media').remove([asset.storage_path])
  if (storageError) return NextResponse.json({ error: 'No se pudo borrar el archivo de imagen.' }, { status: 503 })
  const { error: deleteError } = await admin.from('media_assets').delete().eq('id', id)
  if (deleteError) return NextResponse.json({ error: 'El archivo se borró pero no se pudo quitar su registro de la biblioteca. Vuelve a intentarlo.' }, { status: 503 })
  await admin.from('audit_log').insert({ actor_id: actor.userId, action: 'DELETE', entity_type: 'media_asset', entity_id: id })
  return NextResponse.json({ ok: true })
}
