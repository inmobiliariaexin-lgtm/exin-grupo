import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PropertyGallery } from '@/components/property-gallery'
import { RequestForm } from '@/components/request-form'
import { WhatsAppIcon } from '@/components/whatsapp-icon'
import { getStoredHabiProperty } from '@/lib/habi-store'
import { getPublicSiteSettings, formatPropertyPrice } from '@/lib/site-data'
import { getWhatsAppUrl } from '@/lib/whatsapp'

type Params = { uuid: string }
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { uuid } = await params
  const property = await getStoredHabiProperty(uuid)
  return property
    ? { title: `${property.title} · Habi`, description: property.description || 'Conoce este inmueble disponible con Habi y EXIN Grupo.' }
    : { title: 'Propiedad de Habi' }
}

export default async function HabiPropertyPage({ params }: { params: Promise<Params> }) {
  const [{ uuid }, contacts] = await Promise.all([params, getPublicSiteSettings()])
  const property = await getStoredHabiProperty(uuid)
  if (!property) notFound()

  const whatsappUrl = getWhatsAppUrl(contacts.whatsapp, `Hola, me interesa el inmueble ${property.title} de Habi (código ${property.verification_code}).`)
  const gallery = property.gallery.length ? property.gallery : property.cover_url ? [{ url: property.cover_url, alt: property.title }] : []

  return <main className="section detail-page">
    <Link className="back-link" href="/propiedades?source=habi">← Volver al catálogo de propiedades</Link>
    <PropertyGallery images={gallery} title={property.title} whatsapp={contacts.whatsapp} code={property.verification_code} />
    <div className="detail-heading"><div><p className="eyebrow dark">INMUEBLE DE NUESTRO ALIADO HABI · CÓDIGO {property.verification_code}</p><h1>{property.title}</h1><p className="location">⌖ &nbsp;{[property.neighborhood, property.city].filter(Boolean).join(' · ') || 'Ubicación por confirmar'}</p></div><strong className="detail-price">{formatPropertyPrice(property.price)}</strong></div>
    <div className="detail-specs">{property.bedrooms !== null && <span>{property.bedrooms} habitaciones</span>}{property.bathrooms !== null && <span>{property.bathrooms} baños</span>}{property.garages != null && <span>{property.garages} garajes</span>}{property.area_m2 !== null && <span>{property.area_m2} m²</span>}<span>{property.property_type}</span></div>
    {property.description && <section className="detail-description"><h2>Descripción</h2><p>{property.description}</p></section>}
    <section className="detail-contact"><div className="detail-actions-card"><p className="eyebrow dark">¿TE INTERESA ESTE INMUEBLE?</p><h2>Conversemos sobre esta opción de Habi.</h2><div className="detail-action-list">
      <Link className="button detail-action" href={`/agendar?propertyCode=${encodeURIComponent(property.verification_code)}&propertyTitle=${encodeURIComponent(property.title)}`}>Agendar visita <span>→</span></Link>
      {whatsappUrl && <a className="button button-whatsapp detail-action whatsapp-icon-link" href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="Consultar este inmueble por WhatsApp" title="WhatsApp"><WhatsAppIcon /></a>}
    </div></div><RequestForm kind="contact" propertyCode={property.verification_code} /></section>
  </main>
}
