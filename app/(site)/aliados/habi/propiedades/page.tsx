import type { Metadata } from 'next'
import Link from 'next/link'
import { PropertyCard } from '@/components/property-card'
import { getHabiCatalogErrorMessage } from '@/lib/habi-api'
import { getStoredHabiProperties } from '@/lib/habi-store'

export const metadata: Metadata = {
  title: 'Propiedades disponibles con Habi',
  description: 'Explora inmuebles disponibles de nuestro aliado comercial Habi.',
}

const pageSize = 24

function parseOffset(value?: string) {
  if (!value || !/^\d+$/.test(value)) return 0
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? Math.min(1_000_000, parsed) : 0
}

export default async function HabiPropertiesPage({ searchParams }: { searchParams: Promise<{ offset?: string }> }) {
  const { offset: rawOffset } = await searchParams
  const offset = parseOffset(rawOffset)
  const result = await getStoredHabiProperties(offset, pageSize)
  const errorMessage = getHabiCatalogErrorMessage(result.error)
  const currentPage = Math.floor(offset / pageSize) + 1
  const previousOffset = Math.max(0, offset - pageSize)

  return <main className="section listing-page">
    <p className="eyebrow dark">ALIADO COMERCIAL</p>
    <h1>Propiedades disponibles con Habi</h1>
    <p className="page-lead">Consulta inmuebles compartidos por nuestro aliado. La disponibilidad y los datos pueden cambiar en el catálogo de origen.</p>
    {errorMessage ? <div className="empty-properties" role="status"><span>⌂</span><h2>Catálogo temporalmente no disponible</h2><p>{errorMessage}</p><Link className="text-link" href="/aliados">Volver a aliados <b>→</b></Link></div> : <>
      <p className="result-count">{result.total} {result.total === 1 ? 'inmueble disponible' : 'inmuebles disponibles'}</p>
      {result.properties.length ? <div className="cards">{result.properties.map((property) => <PropertyCard property={property} key={property.uuid} />)}</div> : <div className="empty-properties"><span>⌂</span><h2>No hay inmuebles para mostrar</h2><p>Vuelve a consultar más tarde.</p></div>}
      {(offset > 0 || result.nextOffset !== null) && <nav className="pagination" aria-label="Paginación de propiedades de Habi">
        {offset > 0 && <Link href={`/aliados/habi/propiedades?offset=${previousOffset}`}>← Anterior</Link>}
        <span>Página {currentPage}</span>
        {result.nextOffset !== null && <Link href={`/aliados/habi/propiedades?offset=${result.nextOffset}`}>Siguiente →</Link>}
      </nav>}
    </>}
    <p className="page-lead"><Link className="text-link" href="/propiedades">Ver inmuebles publicados por EXIN Grupo <b>→</b></Link></p>
  </main>
}
