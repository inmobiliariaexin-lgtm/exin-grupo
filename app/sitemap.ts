import type { MetadataRoute } from 'next'
import { getPublicProperties } from '@/lib/site-data'

// The sitemap reads the current property catalog from Supabase. Generate it at
// request time so Cloudflare does not wait for a database query during builds.
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const staticPages = ['', '/propiedades', '/vender', '/credito', '/nosotros', '/contacto', '/aliados', '/terminos']
  const properties = await getPublicProperties()
  return [...staticPages.map((path) => ({ url: `${base}${path}`, lastModified: new Date() })), ...properties.map((property) => ({ url: `${base}/propiedades/${property.slug}`, lastModified: new Date() }))]
}
