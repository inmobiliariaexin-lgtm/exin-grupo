import { NextResponse } from 'next/server'
import { verifyApiAdmin } from '@/lib/api-admin-auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
type Context = { params: Promise<{ id: string }> }
export const dynamic = 'force-dynamic'
export async function GET(_request: Request, { params }: Context) {
  if (!await verifyApiAdmin(['superadmin','admin','commercial','advisor'])) return NextResponse.json({ error:'No autorizado.' },{status:401})
  const { id } = await params, userClient = await createSupabaseServerClient()
  const { data: inquiry } = await userClient.from('inquiries').select('id').eq('id',id).maybeSingle()
  if (!inquiry) return NextResponse.json({ error:'No encontramos esa solicitud.' },{status:404})
  const admin=createSupabaseAdminClient(),{data:attachments}=await admin.from('inquiry_attachments').select('id,storage_path,file_name,created_at').eq('inquiry_id',id).order('created_at')
  if(!attachments?.length)return NextResponse.json({attachments:[]})
  const {data,error}=await admin.storage.from('intake-attachments').createSignedUrls(attachments.map((file)=>file.storage_path),300)
  if(error)return NextResponse.json({error:'No se pudieron crear los enlaces temporales.'},{status:503})
  return NextResponse.json({attachments:attachments.map((file,index)=>({...file,url:data?.[index]?.signedUrl ?? null}))},{headers:{'Cache-Control':'private, no-store'}})
}
