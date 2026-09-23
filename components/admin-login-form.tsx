'use client'
import { useActionState } from 'react'
import { signInAction } from '@/app/admin/login/actions'

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(signInAction, {})
  return <form action={action} className="admin-login-form"><label>Correo electrónico<input name="email" type="email" autoComplete="username" required /></label><label>Contraseña<input name="password" type="password" autoComplete="current-password" required /></label>{state.error && <p className="admin-error" role="alert">{state.error}</p>}<button className="button" disabled={pending}>{pending ? 'Ingresando…' : 'Iniciar sesión'}</button></form>
}
