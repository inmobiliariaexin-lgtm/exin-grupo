import Link from 'next/link'
import type { Property } from '@/lib/types'
import { formatPropertyPrice } from '@/lib/site-data'

export function PropertyCard({ property }: { property: Property }) {
  const place = [property.neighborhood, property.city].filter(Boolean).join(' · ')
  return <article className="property-card"><Link className="card-image" href={`/propiedades/${property.slug}`} aria-label={`Ver ${property.title}`} style={{ backgroundImage: property.cover_url ? `url("${property.cover_url}")` : 'linear-gradient(140deg,#d8dfe2,#9ba8ad)' }}><span className="status">{property.operation === 'sale' ? 'En venta' : 'En arriendo'}</span>{property.is_featured && <span className="feature-tag">Destacada</span>}</Link><div className="card-body"><p className="property-type">{property.property_type}</p><h3><Link href={`/propiedades/${property.slug}`}>{property.title}</Link></h3><p className="location">⌖ &nbsp;{place || 'Ubicación por confirmar'}<br /><small>Código Habi: {property.verification_code}</small></p><div className="specs">{property.bedrooms !== null && <span>{property.bedrooms} hab.</span>}{property.bathrooms !== null && <span>{property.bathrooms} baños</span>}{property.area_m2 !== null && <span>{property.area_m2} m²</span>}</div><div className="card-bottom"><span className="price">{formatPropertyPrice(property.price)}</span><Link className="details" href={`/propiedades/${property.slug}`}>Ver inmueble →</Link></div></div></article>
}
