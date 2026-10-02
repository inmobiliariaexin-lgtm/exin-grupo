import Link from 'next/link'
import { HomePageContent } from '@/components/home-page-content'
import { requireAdminContext } from '@/lib/admin-auth'
import type { AppRole } from '@/lib/types'

export default async function AdminDashboard() {
  const { supabase, profile } = await requireAdminContext()
  const canSeeLeads = (['superadmin','admin','commercial','advisor'] as AppRole[]).includes(profile.role)
  const [properties, featured, pending] = await Promise.all([
    supabase.from('properties').select('*', { count: 'exact', head: true }),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('is_featured', true).eq('status', 'published'),
    canSeeLeads ? supabase.from('inquiries').select('*', { count: 'exact', head: true }).in('status', ['new','contacted','follow_up']) : Promise.resolve({ count: 0 }),
  ])

  return <>
    <div className="admin-visual-hint"><span>Modo de edición</span>Selecciona “Editar esta sección” sobre la portada para cambiar textos, imágenes o visibilidad.</div>
    <HomePageContent editRole={profile.role} />
    <section className="admin-workspace section" id="modulos">
      <div className="section-heading"><div><p className="eyebrow dark">HERRAMIENTAS ADMINISTRATIVAS</p><h2>Actividad y gestión</h2><p>Operación interna, usuarios, solicitudes e información del sitio.</p></div><Link href="/admin/contenido" className="text-link">Editar todas las secciones <b>→</b></Link></div>
      <div className="admin-metrics"><article><span>Propiedades</span><strong>{properties.count ?? 0}</strong><Link href="/admin/propiedades">Gestionar inmuebles →</Link></article><article><span>Destacadas publicadas</span><strong>{featured.count ?? 0} <small>/ 5</small></strong><Link href="/admin/propiedades">Ver catálogo →</Link></article>{canSeeLeads && <article><span>Solicitudes por atender</span><strong>{pending.count ?? 0}</strong><Link href="/admin/leads">Abrir solicitudes →</Link></article>}</div>
      <div className="admin-extra-shortcuts"><Link href="/admin/leads">Leads y datos de clientes</Link><Link href="/admin/citas">Citas</Link><Link href="/admin/credito">Bancos y créditos</Link><Link href="/admin/contenido#multimedia">Imágenes del sitio</Link><Link href="/admin/contenido#modulos">Visibilidad de secciones</Link></div>
    </section>
  </>
}
