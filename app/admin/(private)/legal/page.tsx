import { requireAdminContext } from '@/lib/admin-auth'
import Link from 'next/link'
import { readLegalContent, defaultTermsContent } from '@/lib/legal-content'
import { saveTermsContentAction } from '../actions'

export default async function LegalAdminPage({ searchParams }: { searchParams: Promise<{ error?: string; guardado?: string }> }) {
  const [{ supabase }, query] = await Promise.all([requireAdminContext(['superadmin', 'admin']), searchParams])
  const { data } = await supabase.from('site_modules').select('content').eq('module_key', 'terms').maybeSingle()
  const terms = readLegalContent(data?.content, defaultTermsContent)

  return <>
    <div className="admin-page-heading"><div><p className="eyebrow dark">GESTIÓN DE SITIO</p><h1>Términos y condiciones</h1><p>Edita el texto legal visible en el sitio público.</p></div></div>
    {query.error && <p className="form-alert" role="alert">No se pudo guardar. Revisa que el título y el texto tengan contenido.</p>}
    {query.guardado && <p className="form-success" role="status">Los términos quedaron guardados.</p>}
    <section className="admin-panel legal-admin-note"><div className="panel-title"><h2>Antes de aprobar</h2></div><p>Completa la razón social, el NIT, el domicilio para notificaciones y los canales reales de atención y PQR. Confirma que el texto describe correctamente cómo opera EXIN y pide revisión jurídica colombiana.</p><p>El borrador público permanece identificado como pendiente hasta que una persona administradora confirme la revisión en el formulario.</p></section>
    <section className="admin-panel"><div className="panel-title"><h2>Texto público</h2><Link href="/terminos" target="_blank">Ver página ↗</Link><span>{terms.approved ? 'Aprobado' : 'Borrador'}</span></div>
      <form action={saveTermsContentAction} className="admin-form-grid">
        <label className="wide">Título<input name="title" defaultValue={terms.title} required maxLength={160} /></label>
        <label className="wide">Términos<textarea className="legal-editor" name="body" defaultValue={terms.body} required maxLength={20000} rows={26} /><small>Texto sin HTML. Separa cada apartado con una línea en blanco y usa “# ” al inicio de una línea para los encabezados.</small></label>
        <label className="admin-checkbox legal-approval"><input name="approved" type="checkbox" defaultChecked={terms.approved} /><span>Confirmo que EXIN completó sus datos reales y que esta versión fue revisada y aprobada por la empresa y su asesoría jurídica.</span></label>
        <button className="button" type="submit">Guardar términos</button>
      </form>
    </section>
  </>
}
