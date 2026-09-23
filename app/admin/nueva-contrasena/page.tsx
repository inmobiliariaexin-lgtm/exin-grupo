import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AdminPasswordUpdateForm } from '@/components/admin-password-reset-form'
export const dynamic = 'force-dynamic'
export default async function NewPasswordPage() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getClaims()
  const hasRecoverySession = Boolean(data?.claims?.sub)
  return <main className="admin-login-page"><Link href="/" className="brand"><img src="/assets/logo-exin.png" alt="EXIN Grupo" /></Link><section className="admin-login-card"><p className="eyebrow dark">ACCESO PRIVADO</p><h1>Nueva contraseña</h1>{hasRecoverySession ? <><p>Elige una contraseña nueva para tu cuenta administrativa.</p><AdminPasswordUpdateForm /></> : <><p>Para cambiar la contraseña, solicita un enlace de recuperación nuevo.</p><Link className="button" href="/admin/recuperar-contrasena">Solicitar enlace</Link></>}<Link href="/admin/login" className="back-link">← Volver al inicio de sesión</Link></section></main>
}
