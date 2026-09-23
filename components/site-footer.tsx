import Link from 'next/link'
import type { PublicSiteSettings } from '@/lib/types'

export function SiteFooter({ contacts }: { contacts: PublicSiteSettings }) {
  return <footer className="site-footer"><div className="footer-main"><Link className="brand footer-brand" href="/"><img src="/assets/logo-exin.png" alt="EXIN Grupo" /></Link><p>Confianza en cada paso.</p><nav><Link href="/propiedades">Propiedades</Link><Link href="/credito">Crédito</Link><Link href="/vender">Vende tu inmueble</Link><Link href="/contacto">Contacto</Link><Link href="/privacidad">Privacidad</Link>{contacts.phone && <a href={`tel:${contacts.phone}`}>Teléfono</a>}{contacts.email && <a href={`mailto:${contacts.email}`}>Correo</a>}</nav>{contacts.whatsapp && <a href={`https://wa.me/${contacts.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer">WhatsApp</a>}</div><small>© {new Date().getFullYear()} EXIN Grupo · Bogotá, Colombia.</small></footer>
}
