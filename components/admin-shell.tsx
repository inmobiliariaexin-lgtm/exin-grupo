import Link from 'next/link'
import type { ReactNode } from 'react'
import { signOutAction } from '@/app/admin/(private)/actions'
import type { AppRole } from '@/lib/types'

export function AdminShell({ children, name, role }: { children: ReactNode; name: string; role: AppRole }) {
  const entries: { href: string; label: string; roles?: AppRole[] }[] = [
    { href: '/admin', label: 'Resumen' },
    { href: '/admin/propiedades', label: 'Propiedades', roles: ['superadmin', 'admin'] },
    { href: '/admin/leads', label: 'Leads y crédito', roles: ['superadmin', 'admin', 'commercial', 'advisor'] },
    { href: '/admin/citas', label: 'Citas', roles: ['superadmin', 'admin', 'commercial', 'advisor'] },
    { href: '/admin/contenido', label: 'Contenido', roles: ['superadmin', 'admin', 'editor'] },
    { href: '/admin/ubicaciones', label: 'Ubicaciones y tipos', roles: ['superadmin', 'admin'] },
    { href: '/admin/usuarios', label: 'Usuarios', roles: ['superadmin'] },
    { href: '/admin/configuracion', label: 'Configuración', roles: ['superadmin', 'admin'] },
  ]
  return <div className="admin-shell"><aside className="admin-sidebar"><Link href="/admin" className="admin-logo"><img src="/assets/logo-exin.png" alt="EXIN Grupo" /></Link><p>Panel de administración</p><nav>{entries.filter((entry) => !entry.roles || entry.roles.includes(role)).map((entry) => <Link href={entry.href} key={entry.href}>{entry.label}</Link>)}</nav><Link href="/" className="admin-public-link">Ver sitio público ↗</Link></aside><div className="admin-main"><header className="admin-topbar"><span>{name}</span><span className="role-pill">{role}</span><form action={signOutAction}><button type="submit" className="logout-button">Cerrar sesión</button></form></header><main className="admin-content">{children}</main></div></div>
}
