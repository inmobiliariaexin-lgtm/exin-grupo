import Link from 'next/link'
import type { ReactNode } from 'react'
import { signOutAction } from '@/app/admin/(private)/actions'
import { SiteFooter } from '@/components/site-footer'
import { getHomeContent, getPublicSiteSettings } from '@/lib/site-data'
import type { AppRole } from '@/lib/types'

export async function AdminShell({ children, name, role }: { children: ReactNode; name: string; role: AppRole }) {
  const [contacts, content] = await Promise.all([getPublicSiteSettings(), getHomeContent()])
  const editorRoles: AppRole[] = ['superadmin', 'admin', 'editor']
  const operationalRoles: AppRole[] = ['superadmin', 'admin', 'commercial', 'advisor']
  const canEditContent = editorRoles.includes(role)
  const canManageProperties = ['superadmin', 'admin'].includes(role)
  const links: { href: string; label: string; module?: string }[] = [
    { href: '/admin', label: 'Inicio' },
    { href: canManageProperties ? '/admin/propiedades' : '/propiedades', label: 'Propiedades' },
    { href: canEditContent ? '/admin/contenido#vender' : '/vender', label: 'Vender', module: 'seller' },
    { href: canEditContent ? '/admin/credito' : '/credito', label: 'Crédito', module: 'credit' },
    { href: canEditContent ? '/admin/contenido#nosotros' : '/nosotros', label: 'Nosotros' },
    { href: canEditContent ? '/admin/contenido#contacto' : '/contacto', label: 'Contacto' },
  ]
  const extraEntries: { href: string; label: string; roles: AppRole[] }[] = [
    { href: '/admin/contenido', label: 'Editar todas las secciones', roles: editorRoles },
    { href: '/admin/contenido#modulos', label: 'Secciones visibles y módulos', roles: editorRoles },
    { href: '/admin/contenido#aliados', label: 'Aliados y módulos', roles: editorRoles },
    { href: '/admin/contenido#multimedia', label: 'Biblioteca multimedia', roles: editorRoles },
    { href: '/admin/ubicaciones', label: 'Ciudades y tipos de inmueble', roles: ['superadmin', 'admin'] },
    { href: '/admin/leads', label: 'Solicitudes y datos de clientes', roles: operationalRoles },
    { href: '/admin/citas', label: 'Citas', roles: operationalRoles },
    { href: '/admin/legal', label: 'Términos y condiciones', roles: ['superadmin', 'admin'] },
    { href: '/admin/usuarios', label: 'Usuarios y roles', roles: ['superadmin'] },
    { href: '/admin/configuracion', label: 'Configuración del sitio', roles: ['superadmin', 'admin'] },
    { href: '/admin/configuracion#contacto', label: 'WhatsApp, teléfono y redes', roles: ['superadmin', 'admin'] },
  ]
  const visibleLinks = links.filter((link) => !link.module || content.modules?.[link.module] !== false)
  const visibleExtras = extraEntries.filter((entry) => entry.roles.includes(role))
  const nav = <nav className="nav admin-public-nav" aria-label="Editar secciones principales">{visibleLinks.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}</nav>

  return <div className="admin-site-shell">
    <header className="topbar admin-editor-header">
      <Link className="brand" href="/admin" aria-label="EXIN Grupo, editor de sitio"><img src="/assets/logo-exin.png" alt="EXIN Grupo" /></Link>
      {nav}
      <details className="mobile-nav admin-mobile-nav"><summary aria-label="Abrir menú">☰</summary><div className="mobile-nav-menu">{visibleLinks.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}{visibleExtras.map((entry) => <Link href={entry.href} key={entry.href}>{entry.label}</Link>)}<Link href="/" target="_blank">Ver sitio público ↗</Link></div></details>
      <div className="nav-actions admin-editor-actions">
        {content.modules?.allies !== false && <Link className="habi-link" href={canEditContent ? '/admin/contenido#aliados' : '/aliados'} aria-label={canEditContent ? 'Editar aliados de Habi' : 'Aliados de Habi'}><img src="/assets/logo-habi.png" alt="Habi" /><span>Aliados de Habi</span></Link>}
        <details className="admin-extra-menu"><summary>Administración ▾</summary><nav>{visibleExtras.map((entry) => <Link href={entry.href} key={entry.href}>{entry.label}</Link>)}</nav></details>
        <Link className="admin-view-site" href="/" target="_blank">Ver sitio ↗</Link>
        <div className="admin-user-menu"><span className="admin-user-name">{name}</span><span className="role-pill">{role}</span><form action={signOutAction}><button type="submit" className="logout-button">Salir</button></form></div>
      </div>
    </header>
    <main className="admin-content">{children}</main>
    <SiteFooter contacts={contacts} tagline={content.footer_tagline} editLinks={[...(canEditContent ? [{ href: '/admin/contenido#pie', label: 'Editar frase del pie' }] : []), ...(['superadmin', 'admin'].includes(role) ? [{ href: '/admin/configuracion#contacto', label: 'Editar contactos y redes' }] : [])]} />
  </div>
}
