import type { MetadataRoute } from 'next'
import { getPublicProperties } from '@/lib/site-data'
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const staticPages = ['', '/propiedades', '/vender', '/credito', '/nosotros', '/contacto', '/aliados']
  const properties = await getPublicProperties()
  return [...staticPages.map((path) => ({ url: `${base}${path}`, lastModified: new Date() })), ...properties.map((property) => ({ url: `${base}/propiedades/${property.slug}`, lastModified: new Date() }))]
}
