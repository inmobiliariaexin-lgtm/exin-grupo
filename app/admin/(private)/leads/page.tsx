import { AdminDeleteForm } from '@/components/admin-delete-form'
import { requireAdminContext } from '@/lib/admin-auth'
import { deleteInquiryDataAction, updateInquiryAction } from '../actions'

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ actualizada?: string; error?: string; eliminado?: string; archivos_pendientes?: string }> }) {
  const [{ supabase, profile }, query] = await Promise.all([requireAdminContext(['superadmin', 'admin', 'commercial', 'advisor']), searchParams])
  const [{ data: leads }, { data: team }] = await Promise.all([
    supabase.from('inquiries').select('id,kind,full_name,phone,email,message,property_code,requested_financing,status,assigned_to,created_at').order('created_at', { ascending: false }).limit(100),
    ['superadmin', 'admin'].includes(profile.role)
      ? supabase.from('profiles').select('id,full_name,role').eq('active', true).in('role', ['commercial', 'advisor', 'admin', 'superadmin'])
      : Promise.resolve({ data: [] as { id: string; full_name: string; role: string }[] }),
  ])
  const statuses = [['new', 'Nuevo'], ['contacted', 'Contactado'], ['follow_up', 'En seguimiento'], ['appointment', 'Cita'], ['negotiation', 'Negociación'], ['closed', 'Cerrado']]

  return <>
    <div className="admin-page-heading"><div><p className="eyebrow dark">CRM</p><h1>Leads y solicitudes</h1><p>Datos visibles según el rol asignado. No compartas cuentas entre usuarios.</p></div></div>
    {query.error && <p className="form-alert" role="alert">{query.error === 'no_encontrada' ? 'No encontramos esa solicitud.' : query.error === 'confirmacion' ? 'No se confirmó el borrado.' : query.error === 'archivos' ? 'No se pudieron eliminar los adjuntos. La solicitud se conservó; inténtalo de nuevo.' : 'No pudimos actualizar o eliminar la solicitud.'}</p>}
    {query.actualizada && <p className="form-success">Solicitud actualizada.</p>}
    {query.eliminado && <p className="form-success">Se borraron la solicitud, sus citas vinculadas, los datos personales y los adjuntos.</p>}
    <section className="admin-panel">
      <div className="panel-title"><h2>Solicitudes recientes</h2><span>{leads?.length ?? 0}</span></div>
      {['superadmin', 'admin'].includes(profile.role) && <p className="form-hint">Al borrar una solicitud se eliminan también las citas vinculadas y los datos de contacto. Esta acción no se puede deshacer.</p>}
      {leads?.length ? <div className="admin-table">{leads.map((lead) => <article className="lead-admin-row" key={lead.id}>
        <div><strong>{lead.full_name}</strong><small>{lead.kind} · {new Date(lead.created_at).toLocaleString('es-CO')}</small><p>Tel. {lead.phone} · {lead.email}</p>{lead.property_code && <p>Inmueble: {lead.property_code}</p>}{lead.requested_financing && <p>Interés: {lead.requested_financing}</p>}{lead.message && <p>{lead.message}</p>}</div>
        <div>
          <form action={updateInquiryAction} className="inline-admin-form">
            <input type="hidden" name="id" value={lead.id} />
            <label>Estado<select name="status" defaultValue={lead.status}>{statuses.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
            {['superadmin', 'admin'].includes(profile.role) && <label>Asesor<select name="assigned" defaultValue={lead.assigned_to ?? ''}><option value="">Sin asignar</option>{team?.map((person) => <option key={person.id} value={person.id}>{person.full_name} · {person.role}</option>)}</select></label>}
            <button className="small-button">Guardar</button>
          </form>
          {['superadmin', 'admin'].includes(profile.role) && <AdminDeleteForm action={deleteInquiryDataAction} id={lead.id} buttonLabel="Borrar solicitud y datos" prompt={`Se eliminarán permanentemente la solicitud de ${lead.full_name}, sus datos de contacto, los adjuntos y las citas vinculadas.`} />}
        </div>
      </article>)}</div> : <p className="empty-admin">Todavía no hay solicitudes guardadas. Los formularios requieren configurar Supabase y seguridad antes de activarse.</p>}
    </section>
  </>
}
