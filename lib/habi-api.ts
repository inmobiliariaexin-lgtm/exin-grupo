import 'server-only'
import type { Property } from '@/lib/types'

export const HABI_API_URL = 'https://apiv2.habi.co/brokers-globack-api-offers/estate/property_list_third_parties'
const IMAGE_BASE_URL = 'https://d3hzf1klh28tts.cloudfront.net/'
const DEFAULT_LIMIT = 24
const MAX_LIMIT = 100

export type HabiRawProperty = Record<string, unknown> & {
  uuid?: unknown
  property_id?: unknown
  title?: unknown
  description?: unknown
  sale_price?: unknown
  area?: unknown
  room_count?: unknown
  bathroom_count?: unknown
  property_type?: unknown
  city?: unknown
  neighborhood?: unknown
  address?: unknown
  images?: unknown
  publication_date?: unknown
  garage_count?: unknown
}

type HabiApiResponse = Record<string, unknown> & {
  body?: HabiRawProperty[]
  total_properties?: unknown
  more_offset?: unknown
  more_available?: unknown
  success?: unknown
}

export type HabiProperty = Property & {
  source: 'habi'
  uuid: string
  gallery: { url: string; alt: string }[]
  address: string | null
}

export type HabiCatalogResult = {
  properties: HabiProperty[]
  total: number
  offset: number
  limit: number
  nextOffset: number | null
  error: 'not-configured' | 'unauthorized' | 'invalid-request' | 'unavailable' | 'invalid-response' | 'database-error' | null
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function imageUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value.trim().replace(/^\/+/, ''), IMAGE_BASE_URL)
    return url.protocol === 'https:' && url.hostname === new URL(IMAGE_BASE_URL).hostname ? url.toString() : null
  } catch {
    return null
  }
}

export function normalizeHabiProperty(row: HabiRawProperty): HabiProperty | null {
  const uuid = text(row.uuid)
  if (!uuid) return null

  const images = Array.isArray(row.images) ? row.images.map(imageUrl).filter((url): url is string => Boolean(url)) : []
  const title = text(row.title) ?? `Inmueble Habi ${text(row.property_id) ?? uuid.slice(0, 8)}`
  const numericType = finiteNumber(row.property_type)
  const propertyType = numericType === null ? text(row.property_type) ?? 'Inmueble' : 'Inmueble'
  const propertyId = text(row.property_id) ?? uuid
  const city = text(row.city)
  const neighborhood = text(row.neighborhood)

  return {
    id: `habi:${uuid}`,
    verification_code: propertyId,
    slug: uuid,
    title,
    operation: 'sale',
    property_type: propertyType,
    price: finiteNumber(row.sale_price),
    city,
    neighborhood,
    description: text(row.description),
    bedrooms: finiteNumber(row.room_count),
    bathrooms: finiteNumber(row.bathroom_count),
    garages: finiteNumber(row.garage_count),
    area_m2: finiteNumber(row.area),
    status: 'published',
    is_featured: false,
    cover_url: images[0] ?? null,
    source: 'habi',
    uuid,
    gallery: images.map((url, index) => ({ url, alt: `${title}, fotografía ${index + 1}` })),
    address: text(row.address),
  }
}

function emptyResult(offset: number, limit: number, error: HabiCatalogResult['error']): HabiCatalogResult {
  return { properties: [], total: 0, offset, limit, nextOffset: null, error }
}

export async function getHabiProperties(offset = 0, requestedLimit = DEFAULT_LIMIT): Promise<HabiCatalogResult> {
  const apiKey = process.env.HABI_API_KEY?.trim()
  const safeOffset = Number.isSafeInteger(offset) ? Math.max(0, offset) : 0
  const safeLimit = Number.isSafeInteger(requestedLimit) ? Math.min(MAX_LIMIT, Math.max(1, requestedLimit)) : DEFAULT_LIMIT
  if (!apiKey) return emptyResult(safeOffset, safeLimit, 'not-configured')

  const url = new URL(HABI_API_URL)
  url.searchParams.set('country', 'CO')
  url.searchParams.set('offset', String(safeOffset))
  url.searchParams.set('limit', String(safeLimit))

  try {
    const response = await fetch(url, {
      headers: { 'x-api-key': apiKey, accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 300 },
    })
    if (response.status === 401) return emptyResult(safeOffset, safeLimit, 'unauthorized')
    if (response.status === 400) return emptyResult(safeOffset, safeLimit, 'invalid-request')
    if (!response.ok) return emptyResult(safeOffset, safeLimit, 'unavailable')

    const payload = await response.json() as HabiApiResponse
    if (payload.success === false || !Array.isArray(payload.body)) return emptyResult(safeOffset, safeLimit, 'invalid-response')

    const properties = payload.body.map((item) => isRecord(item) ? normalizeHabiProperty(item as HabiRawProperty) : null).filter((property): property is HabiProperty => Boolean(property)).map((property) => ({ ...property, source_offset: safeOffset }))
    const reportedTotal = finiteNumber(payload.total_properties)
    const total = Math.max(0, Math.floor(reportedTotal ?? safeOffset + properties.length))
    const moreOffset = finiteNumber(payload.more_offset)
    const hasMore = payload.more_available === true || (moreOffset !== null && moreOffset > safeOffset)
    const nextOffset = hasMore ? Math.max(safeOffset + properties.length, Math.floor(moreOffset ?? safeOffset + safeLimit)) : null

    return { properties, total, offset: safeOffset, limit: safeLimit, nextOffset, error: null }
  } catch {
    return emptyResult(safeOffset, safeLimit, 'unavailable')
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function getHabiProperty(uuid: string, offset = 0): Promise<HabiProperty | null> {
  const result = await getHabiProperties(offset, MAX_LIMIT)
  return result.properties.find((property) => property.uuid === uuid) ?? null
}

export function getHabiCatalogErrorMessage(error: HabiCatalogResult['error']): string {
  switch (error) {
    case 'not-configured': return 'El catálogo aliado aún no está conectado.'
    case 'unauthorized': return 'El catálogo de Habi no está disponible por el momento.'
    case 'invalid-request': return 'No se pudo consultar el catálogo de Habi.'
    case 'invalid-response': return 'Habi respondió con un formato que no pudimos leer.'
    case 'database-error': return 'El catálogo guardado todavía no está disponible. Pide a administración que prepare la base de datos y sincronice el inventario.'
    case 'unavailable': return 'No pudimos cargar el catálogo de Habi. Intenta de nuevo más tarde.'
    default: return ''
  }
}
