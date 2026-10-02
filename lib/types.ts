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
  hero_eyebrow: string
  hero_title: string
  hero_subtitle: string
  hero_image: string
  promise_one: string
  promise_two: string
  promise_three: string
  featured_eyebrow: string
  featured_title: string
  featured_subtitle: string
  featured_button: string
  project_eyebrow: string
  project_title: string
  project_emphasis: string
  project_body: string
  project_button: string
  credit_eyebrow: string
  credit_title: string
  credit_body: string
  credit_button: string
  seller_eyebrow: string
  seller_title: string
  seller_body: string
  seller_link: string
  allies_heading: string
  allies_body: string
  allies_link: string
  allies_eyebrow: string
  allies_page_title: string
  allies_page_intro: string
  allies_page_detail: string
  about_eyebrow: string
  about_title: string
  about_intro: string
  about_details: string
  about_button: string
  sell_eyebrow: string
  sell_page_title: string
  sell_intro: string
  sell_benefits: string
  sell_note: string
  contact_eyebrow: string
  contact_title: string
  contact_intro: string
  footer_tagline: string
  modules?: Record<string, boolean>
}

export type PublicSiteSettings = { phone: string; email: string; whatsapp: string; instagram: string; facebook: string; youtube: string; tiktok: string; linkedin: string }
export const defaultPublicSiteSettings: PublicSiteSettings = { phone: '', email: '', whatsapp: '', instagram: '', facebook: '', youtube: '', tiktok: '', linkedin: '' }

export const defaultHomeContent: HomeContent = {
  hero_eyebrow: 'TU PRÓXIMO INMUEBLE ESTÁ AQUÍ',
  hero_title: 'Encuentra tu próximo inmueble',
  hero_subtitle: 'EXIN Grupo te acompaña para encontrar y financiar tu próximo hogar.',
  hero_image: '/assets/hero-referencia.jpg',
  promise_one: 'Acompañamiento\ncercano',
  promise_two: 'Información\ntransparente',
  promise_three: 'Opciones\npara ti',
  featured_eyebrow: 'OPCIONES PARA TU SIGUIENTE CAPÍTULO',
  featured_title: 'Propiedades destacadas',
  featured_subtitle: 'Explora los inmuebles publicados por EXIN Grupo.',
  featured_button: 'Ver propiedades',
  project_eyebrow: '¿TIENES UN PROYECTO EN MENTE?',
  project_title: 'Hagámoslo realidad,',
  project_emphasis: 'paso a paso.',
  project_body: 'Encuentra opciones, explora financiación o vende tu inmueble con acompañamiento.',
  project_button: 'Conversemos',
  credit_eyebrow: 'FINANCIACIÓN A TU MEDIDA',
  credit_title: 'Tu próximo hogar puede estar más cerca.',
  credit_body: 'Conoce opciones de crédito hipotecario y recibe orientación sobre los pasos a seguir.',
  credit_button: 'Conocer opciones',
  seller_eyebrow: '¿ERES PROPIETARIO?',
  seller_title: 'Tu propiedad merece llegar a más personas.',
  seller_body: 'Cuéntanos sobre tu inmueble y conversemos sobre su comercialización.',
  seller_link: 'Quiero vender mi inmueble',
  allies_heading: 'Aliado comercial',
  allies_body: 'EXIN Grupo mantiene una relación comercial con Habi.',
  allies_link: 'Conoce la relación',
  allies_eyebrow: 'RELACIONES COMERCIALES',
  allies_page_title: 'Aliados de EXIN Grupo',
  allies_page_intro: 'EXIN Grupo mantiene una relación comercial con Habi. Esta referencia es informativa y no convierte a Habi en la marca principal del portal.',
  allies_page_detail: 'La descripción y los logotipos de aliados deben contar con autorización y seguir los lineamientos de marca correspondientes.',
  about_eyebrow: 'SOBRE EXIN',
  about_title: 'Inmuebles y acompañamiento, en un mismo lugar.',
  about_intro: 'EXIN Grupo es un portal inmobiliario enfocado en la comercialización de inmuebles y en acompañar a las personas que exploran financiación.',
  about_details: 'Los datos corporativos, la historia de la empresa, los servicios definitivos y los datos de contacto se deben completar desde administración antes del lanzamiento.',
  about_button: 'Habla con el equipo',
  sell_eyebrow: 'VENDE CON EXIN GRUPO',
  sell_page_title: 'Conversemos sobre tu inmueble.',
  sell_intro: 'Déjanos tus datos y una primera descripción. Un integrante del equipo se pondrá en contacto para conocer los detalles.',
  sell_benefits: 'Acompañamiento durante el proceso de comercialización\nInformación clara sobre los siguientes pasos\nContacto directo con el equipo de EXIN',
  sell_note: 'El proceso comercial y los tiempos de atención deben ser definidos por EXIN antes del lanzamiento.',
  contact_eyebrow: 'ESTAMOS PARA ACOMPAÑARTE',
  contact_title: 'Hablemos de lo que estás buscando.',
  contact_intro: 'Escríbenos tu consulta y te contactaremos para conversar sobre propiedades, venta o financiación.',
  footer_tagline: 'Confianza en cada paso.',
}
