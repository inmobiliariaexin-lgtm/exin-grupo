import Link from 'next/link'
import { requireAdminContext } from '@/lib/admin-auth'
import { defaultHomeContent, type HomeContent } from '@/lib/types'
import { saveHomeContentAction, setSiteModuleAction } from '../actions'
import { MediaLibrary } from '@/components/media-library'

type ContentField = Exclude<keyof HomeContent, 'modules'>
type FieldSpec = { key: ContentField; label: string; help?: string; rows?: number }

function ContentFields({ fields, content }: { fields: FieldSpec[]; content: HomeContent }) {
  return <div className="admin-form-grid">{fields.map(({ key, label, help, rows }) => <label className={rows || key === 'hero_image' ? 'wide' : ''} key={key}>{label}{rows ? <textarea name={key} defaultValue={content[key]} rows={rows} required maxLength={2000} /> : <input name={key} defaultValue={content[key]} required maxLength={key === 'hero_image' ? 500 : 1000} />}{help && <small>{help}</small>}</label>)}</div>
}

const contentSections: { id: string; title: string; previewHref: string; fields: FieldSpec[] }[] = [
  { id: 'portada', title: 'Portada principal', previewHref: '/admin#inicio', fields: [
    { key: 'hero_eyebrow', label: 'Frase superior' },
    { key: 'hero_title', label: 'Título principal', rows: 2, help: 'Usa una nueva línea para separar el texto destacado.' },
    { key: 'hero_subtitle', label: 'Descripción', rows: 3 },
    { key: 'hero_image', label: 'Imagen de portada', help: 'Pega una URL de /assets o de la Biblioteca multimedia.' },
    { key: 'promise_one', label: 'Compromiso 1', rows: 2 },
    { key: 'promise_two', label: 'Compromiso 2', rows: 2 },
    { key: 'promise_three', label: 'Compromiso 3', rows: 2 },
  ] },
  { id: 'propiedades', title: 'Propiedades destacadas', previewHref: '/admin#propiedades', fields: [
    { key: 'featured_eyebrow', label: 'Frase superior' }, { key: 'featured_title', label: 'Título' },
    { key: 'featured_subtitle', label: 'Descripción', rows: 2 }, { key: 'featured_button', label: 'Texto del botón' },
  ] },
  { id: 'proyecto', title: 'Franja “Proyecto en mente”', previewHref: '/admin#proyecto', fields: [
    { key: 'project_eyebrow', label: 'Frase superior' }, { key: 'project_title', label: 'Título' },
    { key: 'project_emphasis', label: 'Texto destacado' }, { key: 'project_body', label: 'Descripción', rows: 2 },
    { key: 'project_button', label: 'Texto del botón' },
  ] },
  { id: 'credito', title: 'Tarjeta de crédito', previewHref: '/admin#credito', fields: [
    { key: 'credit_eyebrow', label: 'Frase superior' }, { key: 'credit_title', label: 'Título' },
    { key: 'credit_body', label: 'Descripción', rows: 2 }, { key: 'credit_button', label: 'Texto del botón' },
  ] },
  { id: 'vender', title: 'Venta y página de propietarios', previewHref: '/admin#vender', fields: [
    { key: 'seller_eyebrow', label: 'Frase superior de la tarjeta' }, { key: 'seller_title', label: 'Título de la tarjeta' },
    { key: 'seller_body', label: 'Descripción de la tarjeta', rows: 2 }, { key: 'seller_link', label: 'Texto del enlace' },
    { key: 'sell_eyebrow', label: 'Frase superior de la página' }, { key: 'sell_page_title', label: 'Título de la página' },
    { key: 'sell_intro', label: 'Descripción de la página', rows: 3 }, { key: 'sell_benefits', label: 'Beneficios (uno por línea)', rows: 4 },
    { key: 'sell_note', label: 'Nota informativa', rows: 3 },
  ] },
  { id: 'aliados', title: 'Aliados', previewHref: '/admin#aliados', fields: [
    { key: 'allies_heading', label: 'Encabezado' }, { key: 'allies_body', label: 'Descripción', rows: 2 },
    { key: 'allies_link', label: 'Texto del enlace' }, { key: 'allies_eyebrow', label: 'Frase superior de la página' },
    { key: 'allies_page_title', label: 'Título de la página' }, { key: 'allies_page_intro', label: 'Descripción de la página', rows: 3 },
    { key: 'allies_page_detail', label: 'Texto informativo', rows: 3 },
  ] },
  { id: 'nosotros', title: 'Página Nosotros', previewHref: '/nosotros', fields: [
    { key: 'about_eyebrow', label: 'Frase superior' }, { key: 'about_title', label: 'Título', rows: 2 },
    { key: 'about_intro', label: 'Presentación', rows: 3 }, { key: 'about_details', label: 'Información adicional', rows: 4 },
    { key: 'about_button', label: 'Texto del botón' },
  ] },
  { id: 'contacto', title: 'Página Contacto', previewHref: '/contacto', fields: [
    { key: 'contact_eyebrow', label: 'Frase superior' }, { key: 'contact_title', label: 'Título', rows: 2 },
    { key: 'contact_intro', label: 'Descripción', rows: 3 },
  ] },
  { id: 'pie', title: 'Pie de página', previewHref: '/', fields: [ { key: 'footer_tagline', label: 'Frase junto al logo' } ] },
]

export default async function ContentAdminPage({ searchParams }: { searchParams: Promise<{ error?: string; guardado?: string }> }) {
  const [{ supabase, profile }, query] = await Promise.all([requireAdminContext(['superadmin','admin','editor']), searchParams])
  const [{ data: home }, { data: modules }] = await Promise.all([supabase.from('site_modules').select('content').eq('module_key','home').maybeSingle(), supabase.from('site_modules').select('module_key,enabled').neq('module_key','home')])
  const content = { ...defaultHomeContent, ...(home?.content ?? {}) } as HomeContent
  const moduleNames: Record<string,string> = { featured_properties: 'Propiedades destacadas', credit: 'Crédito hipotecario', seller: 'Vender inmueble', allies: 'Aliados', constructor: 'Constructora', rent: 'Arriendos', project_cta: '¿Tienes un proyecto en mente?' }

  return <>
    <div className="admin-page-heading"><div><p className="eyebrow dark">EDICIÓN VISUAL</p><h1>Editar contenido del sitio</h1><p>Selecciona una sección desde la portada o edita sus textos aquí.</p></div><Link className="small-button" href="/admin">← Volver a la vista del sitio</Link></div>
    {query.error && <p className="form-alert" role="alert">No pudimos guardar los cambios. Revisa los campos y la dirección de la imagen.</p>}
    {query.guardado && <p className="form-success" role="status">Cambios guardados. El contenido actualizado ya se muestra en el sitio.</p>}
    <div className="admin-edit-shortcuts" aria-label="Secciones editables">{contentSections.map(({ id, title }) => <a href={`#${id}`} key={id}>{title}</a>)}</div>
    <form action={saveHomeContentAction}>
      {contentSections.map(({ id, title, previewHref, fields }) => <section className="admin-panel admin-editor-panel" id={id} key={id}>
        <div className="panel-title"><h2>{title}</h2><Link href={previewHref} target={previewHref.startsWith('/admin') ? undefined : '_blank'} aria-label={`Ver sección ${title}`}>{previewHref.startsWith('/admin') ? 'Ver en portada ↗' : 'Ver página ↗'}</Link></div>
        <ContentFields fields={fields} content={content} />
      </section>)}
      <button className="button admin-save-all">Guardar todos los textos</button>
    </form>
    <section className="admin-panel" id="modulos"><div className="panel-title"><h2>Secciones visibles</h2><a href="/admin#modulos">Ver en portada ↗</a></div><div className="module-list">{Object.entries(moduleNames).map(([key,name]) => { const enabled = modules?.find((item) => item.module_key === key)?.enabled ?? !['constructor','rent','project_cta'].includes(key); return <form className="module-row" action={setSiteModuleAction} key={key}><input type="hidden" name="module_key" value={key} /><div><strong>{name}</strong><small>{enabled ? 'Visible en el sitio público' : 'Desactivado'}</small></div><label className="toggle-label"><input type="checkbox" name="enabled" defaultChecked={enabled} /> Activado</label><button className="small-button">Guardar</button></form>})}</div></section>
    <div id="multimedia"><MediaLibrary canDelete={['superadmin','admin'].includes(profile.role)} /></div>
  </>
}
