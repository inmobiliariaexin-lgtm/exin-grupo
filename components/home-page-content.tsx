import Link from 'next/link'
import { PropertyCard } from '@/components/property-card'
import { PropertySearch } from '@/components/property-search'
import { getHomeContent, getRentEnabled } from '@/lib/site-data'
import { getUnifiedCatalogPage } from '@/lib/unified-catalog'
import type { AppRole } from '@/lib/types'

const edits = {
  portada: '/admin/contenido#portada',
  filtros: '/admin/ubicaciones#catalogo',
  propiedades: '/admin/propiedades',
  proyecto: '/admin/contenido#proyecto',
  credito: '/admin/contenido#credito',
  vender: '/admin/contenido#vender',
  aliados: '/admin/contenido#aliados',
  constructora: '/admin/contenido#modulos',
}

function EditHotspot({ href, children = 'Editar esta sección' }: { href: string; children?: string }) {
  return <Link className="edit-hotspot" href={href}>✎ {children}</Link>
}

export async function HomePageContent({ editRole }: { editRole?: AppRole }) {
  const [content, rentEnabled] = await Promise.all([getHomeContent(), getRentEnabled()])
  const catalog = await getUnifiedCatalogPage({}, rentEnabled, { pageSize: 5, homeFeatured: true })
  const { properties, cities, propertyTypes } = catalog
  const canEditContent = !!editRole && ['superadmin', 'admin', 'editor'].includes(editRole)
  const canManageProperties = !!editRole && ['superadmin', 'admin'].includes(editRole)
  const canManageCatalog = !!editRole && ['superadmin', 'admin'].includes(editRole)

  return <main className={editRole ? 'admin-home-preview' : undefined}>
    <section className="hero" id="inicio" style={{ backgroundImage: `url("${content.hero_image || '/assets/hero-referencia.jpg'}")` }}>
      <div className="hero-shade" />
      {canEditContent && <EditHotspot href={edits.portada} />}
      <div className="hero-content">
        <p className="eyebrow">{content.hero_eyebrow}</p>
        <h1>{content.hero_title.split('\n').map((line, index) => <span key={`${index}-${line}`}>{index > 0 && <br />}<em>{index > 0 ? line : ''}</em>{index === 0 ? line : ''}</span>)}</h1>
        <p className="hero-copy">{content.hero_subtitle}</p>
        <div className="promise"><span>◇ <small>{content.promise_one.split('\n').map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>)}</small></span><span>♢ <small>{content.promise_two.split('\n').map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>)}</small></span><span>⌂ <small>{content.promise_three.split('\n').map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>)}</small></span></div>
      </div>
      <Link className="video-link" href="/nosotros"><span className="play">▶</span> Conoce EXIN Grupo</Link>
    </section>

    <div className={canManageCatalog ? 'admin-edit-wrap' : undefined}>
      {canManageCatalog && <EditHotspot href={edits.filtros}>Editar filtros</EditHotspot>}
      <PropertySearch cities={cities} propertyTypes={propertyTypes} rentEnabled={rentEnabled} />
    </div>

    {content.modules?.featured_properties !== false && <section className="section properties" id="propiedades">
      {canManageProperties && <EditHotspot href={edits.propiedades}>Gestionar propiedades</EditHotspot>}
      <div className="section-heading"><div className="featured-heading-copy"><p className="eyebrow dark">{content.featured_eyebrow}</p><h2>{content.featured_title}</h2><p>{content.featured_subtitle}</p><Link className="featured-properties-button" href="/propiedades">{content.featured_button} <span aria-hidden="true">→</span></Link></div></div>
      {properties.length ? <div className="cards">{properties.map((property) => <PropertyCard property={property} key={property.id} editHref={canManageProperties && property.source === 'exin' ? `/admin/propiedades/${property.id}/editar` : undefined} imagesHref={canManageProperties && property.source === 'exin' ? `/admin/propiedades/${property.id}/imagenes` : undefined} />)}</div> : <div className="empty-properties"><span>⌂</span><h3>Estamos preparando el catálogo</h3><p>Las propiedades aparecerán aquí cuando se publiquen o sincronicen.</p><Link className="text-link" href="/contacto">Pregúntanos por opciones <b>→</b></Link></div>}
    </section>}

    {content.modules?.project_cta === true && <section className="mid-cta" id="proyecto">
      {canEditContent && <EditHotspot href={edits.proyecto} />}
      <div className="cta-photo" /><div className="cta-copy"><p className="eyebrow">{content.project_eyebrow}</p><h2>{content.project_title}<br /><em>{content.project_emphasis}</em></h2><p>{content.project_body}</p><Link href="/contacto" className="button">{content.project_button} <span>→</span></Link></div><div className="service-points"><span>⌂<small>Propiedades<br />en venta</small></span><span>◷<small>Crédito<br />hipotecario</small></span><span>♡<small>Acompañamiento<br />cercano</small></span></div>
    </section>}

    {(content.modules?.credit !== false || content.modules?.seller !== false) && <section className="section dual">
      {content.modules?.credit !== false && <article className="info-card credit-card" id="credito">
        {canEditContent && <EditHotspot href={edits.credito} />}
        <div><p className="eyebrow">{content.credit_eyebrow}</p><h2>{content.credit_title}</h2><p>{content.credit_body}</p><Link className="button" href="/credito">{content.credit_button} <span>→</span></Link></div><div className="line-art">⌂</div>
      </article>}
      {content.modules?.seller !== false && <article className="info-card sell-card" id="vender">
        {canEditContent && <EditHotspot href={edits.vender} />}
        <p className="eyebrow dark">{content.seller_eyebrow}</p><h2>{content.seller_title}</h2><p>{content.seller_body}</p><Link className="text-link" href="/vender">{content.seller_link} <b>→</b></Link>
      </article>}
    </section>}

    {content.modules?.allies !== false && <section className="ally-strip" id="aliados">
      {canEditContent && <EditHotspot href={edits.aliados} />}
      <img src="/assets/logo-habi.png" alt="Habi" /><div><strong>{content.allies_heading}</strong><p>{content.allies_body}</p></div><Link href="/aliados" className="text-link">{content.allies_link} <b>→</b></Link>
    </section>}
    {content.modules?.['constructor'] === true && <section className="section info-box" id="constructora">
      {canEditContent && <EditHotspot href={edits.constructora}>Editar módulos</EditHotspot>}
      <strong>Constructora</strong><p>Este módulo está activado, pero los proyectos y contenidos de constructora aún no se han configurado.</p>
    </section>}
  </main>
}
