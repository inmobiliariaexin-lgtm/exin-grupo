import Link from 'next/link'
import type { PublicSiteSettings } from '@/lib/types'

export function SiteHeader({ contacts, modules }: { contacts: PublicSiteSettings; modules: Record<string, boolean> }) {
  const links = [
    { href: '/', label: 'Inicio' },
    { href: '/propiedades', label: 'Propiedades' },
    ...(modules.seller === false ? [] : [{ href: '/vender', label: 'Vender' }]),
    ...(modules.credit === false ? [] : [{ href: '/credito', label: 'Crédito' }]),
    { href: '/nosotros', label: 'Nosotros' },
    { href: '/contacto', label: 'Contacto' },
  ]
  return <header className="topbar"><Link className="brand" href="/" aria-label="EXIN Grupo, inicio"><img src="/assets/logo-exin.png" alt="EXIN Grupo" /></Link><details className="mobile-nav"><summary aria-label="Abrir menú">☰</summary><nav className="mobile-nav-menu">{links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav></details><nav className="nav">{links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav><div className="nav-actions">{modules.allies === false ? null : <Link className="habi-link" href="/aliados" aria-label="Aliado comercial Habi"><span>Aliados</span><img src="/assets/logo-habi.png" alt="Habi" /></Link>}</div></header>
}
