import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { RequestForm } from '@/components/request-form'
import { PropertyCard } from '@/components/property-card'
import { PropertyGallery } from '@/components/property-gallery'
import { getPropertyBySlug, formatPropertyPrice, getPublicSiteSettings, getSimilarProperties } from '@/lib/site-data'
import { getWhatsAppUrl } from '@/lib/whatsapp'
type Params = { slug: string }
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params, property = await getPropertyBySlug(slug)
  const title = property?.seo_title || property?.title
  const description = property?.seo_description || property?.description || (property ? `${property.property_type} en ${property.city ?? 'Colombia'} · Código ${property.verification_code}` : undefined)
  return property ? { title, description, alternates:{canonical:`/propiedades/${property.slug}`}, openGraph: { title, description, images: property.cover_url ? [property.cover_url] : [] } } : { title: 'Inmueble no disponible' }
}
export default async function PropertyDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params, property = await getPropertyBySlug(slug)
  if (!property) notFound()
  const [contacts, similar] = await Promise.all([getPublicSiteSettings(), getSimilarProperties(property)])
  const gallery = (property as typeof property & { gallery: { url: string; alt: string | null; cover: boolean }[] }).gallery ?? []
  const whatsappUrl = getWhatsAppUrl(contacts.whatsapp, `Hola, me interesa el inmueble ${property.title} (código ${property.verification_code}).`)
  return <main className="section detail-page"><Link className="back-link" href="/propiedades">← Volver a propiedades</Link><PropertyGallery images={gallery.map((image) => ({ url: image.url, alt: image.alt || property.title }))} title={property.title} whatsapp={contacts.whatsapp} code={property.verification_code} /><div className="detail-heading"><div><p className="eyebrow dark">{property.operation === 'sale' ? 'INMUEBLE EN VENTA' : 'INMUEBLE EN ARRIENDO'} · CÓDIGO {property.verification_code}</p><h1>{property.title}</h1><p className="location">⌖ &nbsp;{[property.neighborhood, property.city].filter(Boolean).join(' · ')}</p></div><strong className="detail-price">{formatPropertyPrice(property.price)}</strong></div><div className="detail-specs">{property.bedrooms !== null && <span>{property.bedrooms} habitaciones</span>}{property.bathrooms !== null && <span>{property.bathrooms} baños</span>}{property.area_m2 !== null && <span>{property.area_m2} m²</span>}<span>{property.property_type}</span></div><section className="detail-description"><h2>Descripción</h2><p>{property.description || 'Solicita información para conocer más detalles de este inmueble.'}</p></section>{similar.length > 0 && <section className="similar-properties"><div className="section-heading"><div><p className="eyebrow dark">TAMBIÉN TE PUEDE INTERESAR</p><h2>Propiedades similares</h2><p>Opciones del mismo tipo, zona o modalidad.</p></div><Link className="text-link" href={`/propiedades?type=${encodeURIComponent(property.property_type)}&operation=${property.operation}`}>Ver opciones parecidas <b>→</b></Link></div><div className="cards">{similar.map((item) => <PropertyCard property={item} key={item.id} />)}</div></section>}<section className="detail-contact"><div className="detail-actions-card"><p className="eyebrow dark">¿TE INTERESA ESTE INMUEBLE?</p><h2>Conversemos sobre los siguientes pasos.</h2><div className="detail-action-list"><Link className="button detail-action" href={`/agendar?propertyId=${encodeURIComponent(property.id)}&propertyCode=${encodeURIComponent(property.verification_code)}`}>Agendar visita <span>→</span></Link><Link className="button button-secondary detail-action" href={`/credito?propertyId=${encodeURIComponent(property.id)}&propertyCode=${encodeURIComponent(property.verification_code)}`}>Consultar opciones de crédito <span>→</span></Link>{whatsappUrl && <a className="button button-whatsapp detail-action" href={whatsappUrl} target="_blank" rel="noreferrer">Consultar por WhatsApp <span>↗</span></a>}<Link className="button button-outline detail-action" href="/contacto">Solicitar información <span>→</span></Link></div></div><RequestForm kind="contact" propertyId={property.id} propertyCode={property.verification_code} /></section></main>
}
