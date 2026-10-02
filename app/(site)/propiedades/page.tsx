import type { Metadata } from 'next'
import Link from 'next/link'
import { PropertyCard } from '@/components/property-card'
import { FilterMenu } from '@/components/filter-menu'
import { getUnifiedCatalogPage } from '@/lib/unified-catalog'
import { getRentEnabled } from '@/lib/site-data'

export const metadata: Metadata = {
  title: 'Propiedades | EXIN Grupo',
  description: 'Busca en un solo catálogo inmuebles publicados por EXIN Grupo y su aliado Habi.',
}

type Search = {
  q?: string
  city?: string
  type?: string
  operation?: 'sale' | 'rent'
  source?: 'exin' | 'habi'
  sort?: string
  bedrooms?: string
  bathrooms?: string
  minArea?: string
  maxArea?: string
  page?: string
}

function asNumber(value?: string) {
  return value && /^\d+(\.\d+)?$/.test(value) ? Number(value) : undefined
}

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams
  const rentEnabled = await getRentEnabled()
  const source = params.source === 'exin' || params.source === 'habi' ? params.source : undefined
  const result = await getUnifiedCatalogPage({
    query: params.q,
    city: params.city,
    type: params.type,
    operation: params.operation === 'sale' || params.operation === 'rent' ? params.operation : undefined,
    source,
    sort: params.sort,
    bedrooms: asNumber(params.bedrooms),
    bathrooms: asNumber(params.bathrooms),
    minArea: asNumber(params.minArea),
    maxArea: asNumber(params.maxArea),
    page: asNumber(params.page),
  }, rentEnabled)

  const { properties, total, page, pageSize, cities, propertyTypes, unavailableSources } = result
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const pageParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (key !== 'page' && value) pageParams.set(key, value)
  }
  const previousParams = new URLSearchParams(pageParams)
  const nextParams = new URLSearchParams(pageParams)
  if (page > 1) previousParams.set('page', String(page - 1))
  if (page < pageCount) nextParams.set('page', String(page + 1))

  return <main className="section listing-page">
    <p className="eyebrow dark">CATÁLOGO EXIN GRUPO + HABI</p>
    <h1>Propiedades</h1>
    <p className="page-lead">Explora en un solo lugar los inmuebles publicados por EXIN Grupo y nuestro aliado Habi. Cada ficha indica quién ofrece la propiedad.</p>

    {unavailableSources.length > 0 && <p className="form-hint" role="status">
      {unavailableSources.includes('exin') && unavailableSources.includes('habi')
        ? 'Por ahora no pudimos consultar los catálogos. Intenta más tarde.'
        : unavailableSources.includes('habi')
          ? 'El catálogo de Habi no está disponible en este momento; puedes seguir explorando las propiedades de EXIN Grupo.'
          : 'El catálogo de EXIN Grupo no está disponible en este momento; puedes seguir explorando las propiedades de Habi.'}
    </p>}

    <form className="listing-filters" action="/propiedades" method="get">
      <FilterMenu className="listing-filter-menu">
        <p className="filter-menu-heading">Filtrar propiedades</p>
        <div className="listing-filter-grid">
          <label>Buscar por nombre, zona o código<input name="q" defaultValue={params.q} /></label>
          <label>Origen<select name="source" defaultValue={source ?? ''}><option value="">EXIN y Habi</option><option value="exin">EXIN Grupo</option><option value="habi">Aliado Habi</option></select></label>
          <label>Ciudad<select name="city" defaultValue={params.city ?? ''}><option value="">Todas</option>{cities.map((city) => <option key={city}>{city}</option>)}</select></label>
          <label>Tipo<select name="type" defaultValue={params.type ?? ''}><option value="">Todos</option>{propertyTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Operación<select name="operation" defaultValue={params.operation ?? ''}><option value="">Todas</option><option value="sale">Venta</option>{rentEnabled && <option value="rent">Arriendo</option>}</select></label>
          <label>Habitaciones mínimas<input name="bedrooms" type="number" min="0" step="1" defaultValue={params.bedrooms} /></label>
          <label>Baños mínimos<input name="bathrooms" type="number" min="0" step="0.5" defaultValue={params.bathrooms} /></label>
          <label>Área mínima m²<input name="minArea" type="number" min="0" step="1" defaultValue={params.minArea} /></label>
          <label>Área máxima m²<input name="maxArea" type="number" min="0" step="1" defaultValue={params.maxArea} /></label>
          <label>Ordenar<select name="sort" defaultValue={params.sort ?? ''}><option value="">Fecha de publicación</option><option value="price_asc">Precio: menor primero</option><option value="price_desc">Precio: mayor primero</option></select></label>
        </div>
        <div className="filter-menu-actions"><button className="button" type="submit">Aplicar filtros</button><Link className="clear-filter" href="/propiedades">Limpiar filtros</Link></div>
      </FilterMenu>
    </form>

    <p className="result-count">{total} {total === 1 ? 'inmueble disponible' : 'inmuebles disponibles'}</p>
    {properties.length
      ? <div className="cards">{properties.map((property) => <PropertyCard property={property} key={property.id} />)}</div>
      : <div className="empty-properties"><span>⌕</span><h2>No encontramos inmuebles para esos filtros</h2><p>Prueba con otra ciudad o limpia los filtros.</p><Link className="button" href="/propiedades">Ver todos</Link></div>}

    {pageCount > 1 && <nav className="pagination" aria-label="Paginación de propiedades">
      {page > 1 && <Link href={`/propiedades?${previousParams.toString()}`}>← Anterior</Link>}
      <span>Página {page} de {pageCount}</span>
      {page < pageCount && <Link href={`/propiedades?${nextParams.toString()}`}>Siguiente →</Link>}
    </nav>}
  </main>
}
