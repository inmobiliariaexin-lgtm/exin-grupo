import { requireAdminContext } from '@/lib/admin-auth'
import { readCreditContent } from '@/lib/credit-content'
import { CreditSettingsForm } from '@/components/credit-settings-form'
import { MediaLibrary } from '@/components/media-library'

export default async function CreditAdminPage({ searchParams }: { searchParams: Promise<{ error?: string; guardado?: string }> }) {
  const [{ supabase }, query] = await Promise.all([requireAdminContext(['superadmin','admin','editor']), searchParams])
  const [{ data: credit }, { data: home }] = await Promise.all([
    supabase.from('site_modules').select('content').eq('module_key','credit').maybeSingle(),
    supabase.from('site_modules').select('content').eq('module_key','home').maybeSingle(),
  ])
  const homeContent = home?.content && typeof home.content === 'object' && !Array.isArray(home.content) ? home.content as Record<string, unknown> : {}
  const homeTitle = typeof homeContent.credit_title === 'string' ? homeContent.credit_title : undefined
  const content = readCreditContent(credit?.content, homeTitle)
  const errorMessages: Record<string,string> = {
    campos: 'Revisa el título, la introducción y la nota aclaratoria.',
    bancos: 'Revisa que cada entidad tenga un nombre y que los enlaces comiencen con HTTPS. Puedes guardar hasta 20 entidades.',
    imagen: 'Los logos deben venir de la Biblioteca multimedia o de la carpeta /assets.',
    guardar: 'No se pudo guardar en este momento. Inténtalo de nuevo.',
  }

  return <>
    <div className="admin-page-heading"><div><p className="eyebrow dark">GESTIÓN DE SITIO</p><h1>Crédito hipotecario</h1><p>Configura la página pública, los bancos y las imágenes de sus logos.</p></div></div>
    {query.error && <p className="form-alert" role="alert">{errorMessages[query.error] ?? 'No se pudo guardar. Revisa la información y vuelve a intentarlo.'}</p>}
    {query.guardado && <p className="form-success" role="status">La configuración de créditos quedó guardada.</p>}
    <CreditSettingsForm initialContent={content} />
    <section className="admin-panel"><div className="panel-title"><h2>Cómo agregar logos</h2></div><p className="form-hint">Sube aquí el logo de cada entidad. Luego selecciona “Copiar URL” en la imagen y pega ese enlace en el campo “URL del logo” de la entidad correspondiente.</p></section>
    <MediaLibrary />
  </>
}
