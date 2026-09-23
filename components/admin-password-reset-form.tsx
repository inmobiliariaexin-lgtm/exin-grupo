'use client'
import { useActionState } from 'react'
import { requestPasswordResetAction, updatePasswordAction } from '@/app/admin/login/actions'

export function AdminPasswordResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, {})
  return <form action={action} className="admin-login-form"><label>Correo electrónico<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>{state.error && <p className="admin-error" role="alert">{state.error}</p>}{state.success && <p className="form-success" role="status">{state.success}</p>}<button className="button" disabled={pending}>{pending ? 'Enviando…' : 'Enviar enlace de recuperación'}</button></form>
}

export function AdminPasswordUpdateForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, {})
  return <form action={action} className="admin-login-form"><label>Nueva contraseña<input name="password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required /></label><label>Confirma la contraseña<input name="confirmation" type="password" autoComplete="new-password" minLength={10} maxLength={128} required /></label>{state.error && <p className="admin-error" role="alert">{state.error}</p>}<button className="button" disabled={pending}>{pending ? 'Guardando…' : 'Cambiar contraseña'}</button></form>
}
