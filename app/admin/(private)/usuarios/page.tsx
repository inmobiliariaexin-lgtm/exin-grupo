import { requireAdminContext } from '@/lib/admin-auth'
import { AdminDeleteForm } from '@/components/admin-delete-form'
import { deleteAdminUserAction, inviteAdminUserAction, setUserActiveAction } from '../actions'

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ error?: string; invitado?: string; actualizado?: string; eliminado?: string }> }) {
  const [{ supabase, profile }, query] = await Promise.all([requireAdminContext(['superadmin']), searchParams])
  const { data: users } = await supabase.from('profiles').select('id,full_name,role,active,created_at').order('created_at', { ascending: false })
  const message: Record<string, string> = {
    campos: 'Revisa nombre, correo y rol.',
    invitacion: 'No se pudo invitar al usuario. Revisa la configuración SMTP de Supabase Auth.',
    rol: 'La cuenta se creó pero no se pudo asignar el rol. Revisa el perfil desde Supabase.',
    ultimo_superadmin: 'No puedes eliminar la última cuenta superadministradora activa.',
    confirmacion: 'La confirmación no coincide o no se puede borrar tu propia cuenta.',
    usuario: 'No encontramos esa cuenta o no se puede eliminar.',
    borrar: 'No se pudo borrar la cuenta. Revisa la conexión y vuelve a intentarlo.',
  }

  return <>
    <div className="admin-page-heading"><div><p className="eyebrow dark">ACCESO</p><h1>Usuarios y roles</h1><p>Invita al equipo, suspende el acceso o elimina una cuenta y sus datos personales.</p></div></div>
    {query.error && <p className="form-alert" role="alert">{message[query.error] || 'No se pudo actualizar la cuenta.'}</p>}
    {query.invitado && <p className="form-success">Invitación enviada. La persona debe abrir el correo y crear su contraseña antes de iniciar sesión.</p>}
    {query.actualizado && <p className="form-success">El acceso se actualizó.</p>}
    {query.eliminado && <p className="form-success">La cuenta y su perfil se eliminaron. Los registros de trabajo se conservaron sin asignación personal.</p>}

    <section className="admin-panel">
      <div className="panel-title"><h2>Invitar usuario</h2></div>
      <form action={inviteAdminUserAction} className="admin-form-grid">
        <label>Nombre<input name="name" required maxLength={120} /></label>
        <label>Correo<input name="email" type="email" required maxLength={254} /></label>
        <label>Rol<select name="role"><option value="commercial">Comercial</option><option value="advisor">Asesor</option><option value="editor">Editor</option><option value="admin">Administrador</option></select></label>
        <button className="button">Invitar por correo</button>
      </form>
      <p className="form-hint">Recibirá un enlace seguro de Supabase Auth. Al abrirlo, definirá su contraseña.</p>
    </section>

    <section className="admin-panel">
      <div className="panel-title"><h2>Cuentas activas e inactivas</h2></div>
      <p className="form-hint">Desactivar impide iniciar sesión y se puede revertir. Eliminar borra permanentemente el acceso, el correo y el perfil. Las propiedades y registros existentes se conservan sin atribución personal. No es posible eliminar tu propia cuenta ni la última cuenta superadministradora activa.</p>
      {users?.length ? <div className="admin-table">{users.map((user) => <article className="property-admin-row" key={user.id}>
        <div><strong>{user.full_name}</strong><small>{user.role} · {user.active ? 'Activo' : 'Desactivado'}</small></div>
        <div className="inline-admin-form">
          <form action={setUserActiveAction}>
            <input type="hidden" name="id" value={user.id} />
            <input type="hidden" name="active" value={String(!user.active)} />
            <button className="small-button">{user.active ? 'Desactivar' : 'Activar'}</button>
          </form>
          {user.id !== profile.id && <AdminDeleteForm action={deleteAdminUserAction} id={user.id} buttonLabel="Eliminar cuenta" prompt={`Se eliminarán el acceso y el perfil de ${user.full_name} (${user.role}). Esta acción es permanente; el contenido comercial se conserva y queda sin responsable.`} />}
        </div>
      </article>)}</div> : <p className="empty-admin">No hay perfiles creados. Crea la primera cuenta desde el panel de Supabase; el perfil se aprovisionará automáticamente.</p>}
    </section>
  </>
}
