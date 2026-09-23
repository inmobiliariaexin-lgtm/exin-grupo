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
  return <header className="topbar"><Link className="brand" href="/" aria-label="EXIN Grupo, inicio"><img src="/assets/logo-exin.png" alt="EXIN Grupo" /></Link><details className="mobile-nav"><summary aria-label="Abrir menú">☰</summary><nav className="mobile-nav-menu">{links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav></details><nav className="nav">{links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav><div className="nav-actions">{modules.allies === false ? null : <><span className="allies">Aliados</span><Link className="text-link" href="/aliados">Conócelos</Link></>}{contacts.whatsapp && <Link className="button button-small" href={`https://wa.me/${contacts.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer">WhatsApp ↗</Link>}</div></header>
}
