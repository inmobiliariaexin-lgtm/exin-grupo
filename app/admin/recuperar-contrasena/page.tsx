import Link from 'next/link'
import { AdminPasswordResetRequestForm } from '@/components/admin-password-reset-form'
export default function RecoverPasswordPage() {
  return <main className="admin-login-page"><Link href="/" className="brand"><img src="/assets/logo-exin.png" alt="EXIN Grupo" /></Link><section className="admin-login-card"><p className="eyebrow dark">ACCESO PRIVADO</p><h1>Recuperar contraseña</h1><p>Te enviaremos un enlace al correo de tu cuenta administrativa.</p><AdminPasswordResetRequestForm /><Link href="/admin/login" className="back-link">← Volver al inicio de sesión</Link></section></main>
}
