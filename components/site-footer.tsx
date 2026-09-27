import Link from 'next/link'
import type { PublicSiteSettings } from '@/lib/types'
import { SocialLinks } from '@/components/social-links'
import { getWhatsAppUrl } from '@/lib/whatsapp'

export function SiteFooter({ contacts }: { contacts: PublicSiteSettings }) {
  const whatsappUrl = getWhatsAppUrl(contacts.whatsapp, 'Hola, quisiera recibir información de EXIN Grupo.')
  return <footer className="site-footer"><div className="footer-main"><Link className="brand footer-brand" href="/"><img src="/assets/logo-exin.png" alt="EXIN Grupo" /></Link><p>Confianza en cada paso.</p><nav><Link href="/propiedades">Propiedades</Link><Link href="/credito">Crédito</Link><Link href="/vender">Vende tu inmueble</Link><Link href="/contacto">Contacto</Link><Link href="/terminos">Términos y condiciones</Link><Link href="/privacidad">Privacidad</Link>{contacts.phone && <a href={`tel:${contacts.phone}`}>Teléfono</a>}{contacts.email && <a href={`mailto:${contacts.email}`}>Correo</a>}</nav>{whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>}<SocialLinks contacts={contacts} /></div><small>© {new Date().getFullYear()} EXIN Grupo · Bogotá, Colombia.</small></footer>
}
