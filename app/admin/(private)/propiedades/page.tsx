import Link from 'next/link'
import { requireAdminContext } from '@/lib/admin-auth'
import { AdminDeleteForm } from '@/components/admin-delete-form'
import { getActiveCities, getActivePropertyTypes } from '@/lib/site-data'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { deletePropertyAction, setPropertyStatusAction, createPropertyAction } from '../actions'

export default async function AdminPropertiesPage({ searchParams }: { searchParams: Promise<{ error?: string; guardada?: string; actualizada?: string; eliminada?: string; archivos_pendientes?: string }> }) {
  const [{ supabase }, cities, types, query] = await Promise.all([
    requireAdminContext(['superadmin', 'admin']),
    getActiveCities(),
    getActivePropertyTypes(),
    searchParams,
  ])
  const admin = createSupabaseAdminClient()

  const [{ data: properties }, { data: typesAll }, { count: publishedCount }, { count: habiCount }] = await Promise.all([
    supabase.from('properties').select('id,verification_code,slug,title,status,operation,price,is_featured,created_at').order('created_at', { ascending: false }).limit(100),
    supabase.from('property_types').select('name').eq('active', true).order('sort_order'),
    supabase.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    admin.from('habi_properties').select('storage_key', { count: 'exact', head: true }).eq('active', true).not('external_uuid', 'is', null),
  ])

  const propertyIds = (properties ?? []).map((property) => property.id)
  const { data: imageRows } = propertyIds.length
    ? await supabase.from('property_images').select('property_id,is_cover').in('property_id', propertyIds)
    : { data: [] as { property_id: string; is_cover: boolean }[] }
  const photoSummary = new Map<string, { count: number; hasCover: boolean }>()
  for (const image of imageRows ?? []) {
    const summary = photoSummary.get(image.property_id) ?? { count: 0, hasCover: false }
    summary.count += 1
    summary.hasCover ||= image.is_cover
    photoSummary.set(image.property_id, summary)
  }

  const errors: Record<string, string> = {
    campos: 'Completa los campos requeridos.',
    numero: 'Revisa los valores numéricos.',
    duplicado: 'El código o URL ya está registrado. Verifica los datos del inmueble.',
    guardar: 'No pudimos guardar el inmueble.',
    confirmacion: 'No se confirmó el borrado.',
    no_encontrado: 'No encontramos ese inmueble.',
    borrar: 'No se pudo eliminar el inmueble.',
    archivos: 'No se pudieron eliminar las fotografías. El inmueble se conservó; inténtalo de nuevo.',
    destacadas: 'Ya hay cinco propiedades destacadas. Retira una antes de agregar otra.',
  }

  return <>
    <div className="admin-page-heading">
      <div>
        <p className="eyebrow dark">CATÁLOGO UNIFICADO</p>
        <h1>Propiedades de EXIN</h1>
        <p>Administra los inmuebles propios. El catálogo público también reúne las propiedades sincronizadas de Habi.</p>
      </div>
      <div className="inline-admin-form"><Link href="/admin/contenido" className="small-button">Biblioteca multimedia</Link><Link href="/admin/aliados/habi" className="small-button">Administrar catálogo Habi</Link></div>
    </div>
    {query.error && <p className="form-alert" role="alert">{errors[query.error] || 'Ocurrió un error.'}</p>}
    {query.guardada && <p className="form-success">Inmueble registrado. Ahora puedes cargar sus fotografías en la lista de abajo.</p>}
    {query.actualizada && <p className="form-success">Estado actualizado.</p>}
    {query.eliminada && <p className="form-success">Inmueble, ficha y fotografías eliminados. Las solicitudes de clientes se conservaron.</p>}

    <section className="admin-panel" aria-labelledby="catalog-source-heading">
      <div className="panel-title"><h2 id="catalog-source-heading">Fuentes del catálogo público</h2><Link className="small-button" href="/propiedades" target="_blank">Ver catálogo ↗</Link></div>
      <div className="admin-metrics">
        <article><span>Propiedades de EXIN publicadas</span><strong>{publishedCount ?? 0}</strong><Link className="text-link" href="#exin-properties">Crear o editar inmuebles →</Link></article>
        <article><span>Propiedades activas de Habi</span><strong>{habiCount ?? 0}</strong><Link className="text-link" href="/admin/aliados/habi">Revisar sincronización →</Link></article>
      </div>
      <p className="form-hint">La información de EXIN se guarda en sus fichas y biblioteca de fotos. La información recibida de Habi queda organizada en su catálogo sincronizado, conservando los campos y la respuesta original. El sitio presenta ambos orígenes en una sola búsqueda.</p>
    </section>

    <section className="admin-panel" id="exin-properties">
      <div className="panel-title"><h2>Registrar inmueble</h2></div>
      <p className="form-hint">Guarda primero la ficha. Después aparecerá el botón <strong>Cargar fotos</strong> en la lista de inmuebles recientes.</p>
      <form action={createPropertyAction} className="admin-form-grid">
        <label>Código de Habi<input name="code" required maxLength={64} /></label>
        <label>Título de la ficha<input name="title" required maxLength={180} /></label>
        <label>Operación<select name="operation"><option value="sale">Venta</option><option value="rent">Arriendo</option></select></label>
        <label>Tipo<select name="type" required>{(typesAll?.length ? typesAll.map((item) => item.name) : types).map((type) => <option key={type}>{type}</option>)}</select></label>
        <label>Ciudad<select name="city" required>{cities.map((city) => <option key={city}>{city}</option>)}</select></label>
        <label>Barrio o zona<input name="neighborhood" maxLength={120} /></label>
        <label>Precio en COP<input name="price" type="number" min="0" step="1" /></label>
        <label>Área en m²<input name="area" type="number" min="0" step="0.01" /></label>
        <label>Habitaciones<input name="bedrooms" type="number" min="0" step="1" /></label>
        <label>Baños<input name="bathrooms" type="number" min="0" step="0.5" /></label>
        <label>Estado<select name="status"><option value="draft">Borrador</option><option value="published">Publicada</option></select></label>
        <label className="admin-checkbox"><input name="featured" type="checkbox" /> Destacar (máximo cinco publicaciones activas)</label>
        <label className="wide">Descripción<textarea name="description" rows={4} maxLength={5000} /></label>
        <button className="button" type="submit">Guardar inmueble</button>
      </form>
    </section>

    <section className="admin-panel" aria-labelledby="property-photo-guide">
      <div className="panel-title"><h2 id="property-photo-guide">Cómo subir las fotos del inmueble</h2></div>
      <ol>
        <li>Guarda primero los datos del inmueble.</li>
        <li>En “Inmuebles recientes”, pulsa <strong>Cargar fotos</strong> junto al inmueble correspondiente.</li>
        <li>Selecciona una foto JPG, PNG, WebP o AVIF de hasta 3 MB y escribe una descripción breve.</li>
        <li>La primera foto queda como portada automáticamente. Puedes escoger otra portada y cambiar el orden con las flechas.</li>
      </ol>
      <p className="form-hint">Puedes cargar hasta 30 fotos por inmueble. La galería se muestra en el sitio cuando la ficha está publicada. Para imágenes de portada y contenido general, usa la <Link href="/admin/contenido">Biblioteca multimedia</Link>.</p>
    </section>

    <section className="admin-panel">
      <div className="panel-title"><h2>Inmuebles recientes</h2><span>{properties?.length ?? 0}</span></div>
      {properties?.length
        ? <div className="admin-table">
          {properties.map((property) => {
            const photos = photoSummary.get(property.id) ?? { count: 0, hasCover: false }
            const photoStatus = photos.count === 0 ? 'Sin fotos' : `${photos.count} ${photos.count === 1 ? 'foto' : 'fotos'}${photos.hasCover ? ' · portada lista' : ' · falta elegir portada'}`
            return <article className="property-admin-row" key={property.id}>
              <div>
                <strong>{property.title}</strong>
                <small>Código {property.verification_code} · {property.operation === 'sale' ? 'Venta' : 'Arriendo'} · {photoStatus}</small>
                <div className="inline-admin-form">
                  <Link href={`/admin/propiedades/${property.id}/editar`} className="small-button">Editar ficha</Link>
                  <Link href={`/admin/propiedades/${property.id}/imagenes`} className="small-button">{photos.count ? 'Editar fotos' : 'Cargar fotos'}</Link>
                  <Link href={`/propiedades/${property.slug}`} target="_blank" className="small-button">Ver ficha ↗</Link>
                  <AdminDeleteForm action={deletePropertyAction} id={property.id} buttonLabel="Borrar inmueble" prompt={`Se eliminarán permanentemente ${property.title}, su ficha y sus fotografías. Las solicitudes de clientes vinculadas se conservarán sin relación al inmueble.`} />
                </div>
              </div>
              <form action={setPropertyStatusAction} className="inline-admin-form">
                <input type="hidden" name="id" value={property.id} />
                <select name="status" defaultValue={property.status} aria-label={`Estado de ${property.title}`}>
                  <option value="draft">Borrador</option><option value="published">Publicada</option><option value="inactive">Inactiva</option><option value="sold">Vendida</option>
                </select>
                <label><input name="featured" type="checkbox" defaultChecked={property.is_featured} /> Destacar</label>
                <button className="small-button">Guardar</button>
              </form>
            </article>
          })}
        </div>
        : <p className="empty-admin">No hay inmuebles. El portal no muestra ofertas de ejemplo.</p>}
    </section>
  </>
}
