import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminContext } from '@/lib/admin-auth'
import { PropertyGalleryManager } from '@/components/property-gallery-manager'
export default async function PropertyImagesPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { supabase }] = await Promise.all([params, requireAdminContext(['superadmin','admin'])])
  const { data: property } = await supabase.from('properties').select('id,title,verification_code').eq('id',id).maybeSingle()
  if (!property) notFound()
  const { data: rows } = await supabase.from('property_images').select('id,storage_path,alt_text,sort_order,is_cover').eq('property_id',id).order('sort_order')
  const images = (rows??[]).map((row)=>({...row,url:supabase.storage.from('property-images').getPublicUrl(row.storage_path).data.publicUrl}))
  return <><div className="admin-page-heading"><div><p className="eyebrow dark">GALERÍA</p><h1>{property.title}</h1><p>Código de Habi: {property.verification_code}</p></div><Link href="/admin/propiedades" className="back-link">← Volver a propiedades</Link></div><section className="admin-panel"><div className="panel-title"><h2>Fotografías del inmueble</h2><span>{images.length} / 30</span></div><PropertyGalleryManager propertyId={id} images={images} /></section></>
}
