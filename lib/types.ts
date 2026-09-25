export type AppRole = 'superadmin' | 'admin' | 'commercial' | 'advisor' | 'editor'
export type Property = {
  id: string
  verification_code: string
  slug: string
  title: string
  operation: 'sale' | 'rent'
  property_type: string
  price: number | null
  city: string | null
  neighborhood: string | null
  description: string | null
  bedrooms: number | null
  bathrooms: number | null
  area_m2: number | null
  seo_title?: string | null
  seo_description?: string | null
  status: 'draft' | 'published' | 'inactive' | 'sold'
  is_featured: boolean
  cover_url?: string | null
}

export type HomeContent = {
  hero_title: string
  hero_subtitle: string
  hero_image: string
  credit_title: string
  seller_title: string
  modules?: Record<string, boolean>
}

export type PublicSiteSettings = { phone: string; email: string; whatsapp: string; instagram: string; facebook: string }
export const defaultPublicSiteSettings: PublicSiteSettings = { phone: '', email: '', whatsapp: '', instagram: '', facebook: '' }

export const defaultHomeContent: HomeContent = {
  hero_title: 'Encuentra tu próximo inmueble',
  hero_subtitle: 'EXIN Grupo te acompaña para encontrar y financiar tu próximo hogar.',
  hero_image: '/assets/hero-referencia.jpg',
  credit_title: 'Tu próximo hogar puede estar más cerca.',
  seller_title: 'Tu propiedad merece llegar a más personas.',
}
