import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminContext } from '@/lib/admin-auth'
import { getActiveCities, getActivePropertyTypes } from '@/lib/site-data'
import { updatePropertyAction } from '@/app/admin/(private)/actions'

type SearchParams = { error?: string }

export default async function EditPropertyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const [{ id }, { supabase }, cities, types, query] = await Promise.all([
    params,
    requireAdminContext(['superadmin', 'admin']),
    getActiveCities(),
    getActivePropertyTypes(),
    searchParams,
  ])
  const { data: property } = await supabase.from('properties').select('id,verification_code,slug,title,operation,property_type,price,city,neighborhood,description,bedrooms,bathrooms,area_m2,status,is_featured,seo_title,seo_description').eq('id', id).maybeSingle()
  if (!property) notFound()

  const errorMessages: Record<string, string> = {
    campos: 'Revisa los campos y sus límites de texto.',
    numero: 'Los valores numéricos no son válidos.',
    destacadas: 'Ya hay cinco propiedades destacadas. Retira una antes de destacar esta ficha.',
    guardar: 'No se pudieron guardar los cambios. Revisa el estado y vuelve a intentarlo.',
  }

  return <>
    <div className="admin-page-heading">
      <div><p className="eyebrow dark">EDITAR INMUEBLE</p><h1>{property.title}</h1><p>Código de Habi: {property.verification_code}</p></div>
      <div className="inline-admin-form">
        <Link className="small-button" href={`/admin/propiedades/${property.id}/imagenes`}>Cargar o editar fotos</Link>
        <Link className="back-link" href="/admin/propiedades">Volver al catálogo</Link>
      </div>
    </div>
    {query.error && <p className="form-alert" role="alert">{errorMessages[query.error] || 'No se pudieron guardar los cambios.'}</p>}
    <section className="admin-panel">
      <div className="panel-title"><h2>Datos de publicación</h2></div>
      <form action={updatePropertyAction} className="admin-form-grid">
        <input type="hidden" name="id" value={property.id} />
        <label>Título<input name="title" defaultValue={property.title} required maxLength={180} /></label>
        <label>Operación<select name="operation" defaultValue={property.operation}><option value="sale">Venta</option><option value="rent">Arriendo</option></select></label>
        <label>Tipo<select name="type" defaultValue={property.property_type} required>{[...new Set([property.property_type, ...types])].map((type) => <option key={type}>{type}</option>)}</select></label>
        <label>Ciudad<select name="city" defaultValue={property.city ?? ''} required>{[...new Set([property.city, ...cities].filter((city): city is string => Boolean(city)))].map((city) => <option key={city}>{city}</option>)}</select></label>
        <label>Barrio o zona<input name="neighborhood" defaultValue={property.neighborhood ?? ''} maxLength={120} /></label>
        <label>Precio en COP<input name="price" type="number" min="0" step="1" defaultValue={property.price ?? ''} /></label>
        <label>Área en m²<input name="area" type="number" min="0.01" step="0.01" defaultValue={property.area_m2 ?? ''} /></label>
        <label>Habitaciones<input name="bedrooms" type="number" min="0" step="1" defaultValue={property.bedrooms ?? ''} /></label>
        <label>Baños<input name="bathrooms" type="number" min="0" step="0.5" defaultValue={property.bathrooms ?? ''} /></label>
        <label>Estado<select name="status" defaultValue={property.status}><option value="draft">Borrador</option><option value="published">Publicada</option><option value="inactive">Inactiva</option><option value="sold">Vendida</option></select></label>
        <label className="admin-checkbox"><input name="featured" type="checkbox" defaultChecked={property.is_featured} /> Mostrar como destacada (máximo cinco)</label>
        <label className="wide">Descripción<textarea name="description" rows={5} maxLength={5000} defaultValue={property.description ?? ''} /></label>
        <div className="wide"><h3>Vista en buscadores</h3><p className="form-hint">Si dejas estos campos vacíos, se usará el título y la descripción de la ficha.</p></div>
        <label className="wide">Título SEO<input name="seo_title" maxLength={160} defaultValue={property.seo_title ?? ''} /></label>
        <label className="wide">Descripción SEO<textarea name="seo_description" rows={3} maxLength={320} defaultValue={property.seo_description ?? ''} /></label>
        <button className="button" type="submit">Guardar cambios</button>
      </form>
    </section>
  </>
}
