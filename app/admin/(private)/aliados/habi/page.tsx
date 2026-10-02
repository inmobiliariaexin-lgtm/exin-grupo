import { HabiSyncControl } from './sync-control'
import { requireAdminContext } from '@/lib/admin-auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type Query = { sync?: string; saved?: string; received?: string; error?: string }

const errorMessages: Record<string, string> = {
  'not-configured': 'Falta configurar la llave privada HABI_API_KEY en los secretos del Worker de Cloudflare.',
  unauthorized: 'Habi rechazó la llave o no tiene permiso para consultar el catálogo. Revisa la llave con Habi.',
  'invalid-request': 'Habi rechazó los parámetros de consulta.',
  unavailable: 'El intento anterior se interrumpió antes de publicar el catálogo. El avance quedó guardado y se puede continuar desde aquí.',
  'invalid-response': 'La respuesta de Habi llegó incompleta o con un formato distinto al esperado. El catálogo anterior se conserva.',
  'page-limit': 'La consulta superó el límite preventivo de páginas. El catálogo anterior se conserva; revisa la paginación de Habi.',
  'database-error': 'No se pudo guardar toda la actualización. Los registros anteriores se conservan; revisa la configuración de Supabase.',
}

export default async function AdminHabiCatalogPage({ searchParams }: { searchParams: Promise<Query> }) {
  await requireAdminContext(['superadmin', 'admin'])
  const query = await searchParams
  const admin = createSupabaseAdminClient()
  const [totalResult, activeResult, latestRunResult, latestSuccessResult] = await Promise.all([
    admin.from('habi_properties').select('storage_key', { count: 'exact', head: true }),
    admin.from('habi_properties').select('storage_key', { count: 'exact', head: true }).eq('active', true).not('external_uuid', 'is', null),
    admin.from('habi_sync_runs').select('id,status,started_at,finished_at,properties_received,properties_saved,pages_received,error_code').order('started_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('habi_sync_runs').select('id,finished_at,properties_saved').eq('status', 'succeeded').order('finished_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  const totalCount = totalResult.count
  const activeCount = activeResult.count
  const latestRun = latestRunResult.data
  const latestSuccess = latestSuccessResult.data
  const schemaReady = !totalResult.error && !activeResult.error && !latestRunResult.error && !latestSuccessResult.error
  const apiKeyConfigured = Boolean(process.env.HABI_API_KEY?.trim())

  return <>
    <div className="admin-page-heading">
      <div>
        <p className="eyebrow dark">INTEGRACIÓN COMERCIAL</p>
        <h1>Catálogo de Habi</h1>
        <p>Guarda el catálogo completo de Habi en Supabase y publica desde una copia local que puedes consultar aunque el API no responda.</p>
      </div>
    </div>

    {query.sync === 'ok' && <p className="form-success" role="status">Actualización completa: {query.received ?? '—'} registros recibidos; {query.saved ?? '—'} guardados.</p>}
    {query.error && <p className="form-alert" role="alert">{errorMessages[query.error] ?? 'No se pudo sincronizar el catálogo.'}</p>}

    <section className="admin-panel">
      <div className="panel-title"><h2>Estado del catálogo</h2><span>{apiKeyConfigured ? 'Conexión configurada' : 'Falta configurar conexión'}</span></div>
      <div className="admin-metrics">
        <article><span>Registros recibidos y conservados</span><strong>{totalCount ?? 0}</strong></article>
        <article><span>Disponibles en el sitio</span><strong>{activeCount ?? 0}</strong></article>
        <article><span>Última sincronización correcta</span><strong>{latestSuccess?.finished_at ? new Date(latestSuccess.finished_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }) : 'Aún no hay'}</strong></article>
      </div>
      {latestRun && <p className="form-hint">Último intento: {latestRun.status === 'succeeded' ? 'completado' : latestRun.status === 'running' ? 'en curso' : 'con error'} · {latestRun.properties_received} recibidos · {latestRun.properties_saved} guardados · {latestRun.pages_received} páginas.</p>}
      {latestRun?.status === 'failed' && latestRun.error_code && <p className="form-alert" role="status">{errorMessages[latestRun.error_code] ?? 'El último intento de sincronización no se completó.'}</p>}
      {!schemaReady && <p className="form-alert" role="alert">Aún falta aplicar a Supabase la migración que crea el almacenamiento del catálogo Habi.</p>}
      {!apiKeyConfigured && <p className="form-hint">Para habilitar el botón, configura <code>HABI_API_KEY</code> como secreto del Worker de Cloudflare. No escribas la llave en el código ni en GitHub.</p>}
      <HabiSyncControl
        apiKeyConfigured={apiKeyConfigured}
        schemaReady={schemaReady}
        resumableRunId={latestRun?.status === 'running' ? latestRun.id : null}
        resumableReceived={latestRun?.status === 'running' ? latestRun.properties_received : 0}
        resumablePages={latestRun?.status === 'running' ? latestRun.pages_received : 0}
      />
    </section>

    <section className="admin-panel">
      <div className="panel-title"><h2>Qué se guarda</h2></div>
      <p>Se conserva la respuesta original completa de cada inmueble en formato JSON, junto con sus campos normalizados, imágenes y fecha de publicación. También se guarda el resultado de paginación que devuelve cada consulta y el historial de cada sincronización.</p>
      <p>Si una actualización falla o llega incompleta, los datos anteriores permanecen disponibles. Los inmuebles que Habi ya no devuelve se dejan inactivos al terminar una sincronización completa; sus datos no se borran.</p>
      <p className="form-hint">La dirección y la respuesta original permanecen privadas en la base de datos. El sitio entrega a los visitantes solo los datos necesarios para mostrar la ficha.</p>
    </section>
  </>
}
