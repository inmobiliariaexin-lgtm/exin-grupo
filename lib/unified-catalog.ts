import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabasePublicClient } from '@/lib/supabase/public'
import { hasSupabasePublicEnv } from '@/lib/supabase/env'
import type { Property } from '@/lib/types'

const chunkSize = 1_000
const maxCatalogRows = 20_000

type ExinRow = Omit<Property, 'cover_url' | 'source'> & { published_at: string | null }
type HabiRow = {
  external_uuid: string | null
  property_id: string | null
  title: string | null
  description: string | null
  sale_price: number | string | null
  area: number | string | null
  room_count: number | string | null
  bathroom_count: number | string | null
  garage_count: number | string | null
  property_type: unknown
  city: string | null
  neighborhood: string | null
  image_urls: unknown
  publication_date: string | null
  source_offset: number | null
}

type CatalogEntry = { property: Property; publishedAt: number | null }
type CatalogFilters = {
  query?: string
  city?: string
  type?: string
  operation?: 'sale' | 'rent'
  bedrooms?: number
  bathrooms?: number
  minArea?: number
  maxArea?: number
  sort?: string
  page?: number
}

type CatalogResult = {
  properties: Property[]
  total: number
  page: number
  pageSize: number
  cities: string[]
  propertyTypes: string[]
  unavailableSources: Array<'exin' | 'habi'>
}

type PageResult<T> = { data: T[] | null; error: unknown }

async function readAllPages<T>(loadPage: (from: number, to: number) => Promise<PageResult<T>>) {
  const rows: T[] = []
  for (let from = 0; from < maxCatalogRows; from += chunkSize) {
    const { data, error } = await loadPage(from, from + chunkSize - 1)
    if (error) return { rows, ok: false }
    const page = data ?? []
    rows.push(...page)
    if (page.length < chunkSize) return { rows, ok: true }
  }
  return { rows, ok: rows.length < maxCatalogRows }
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : []
}

function parseDate(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function mapExinRow(row: ExinRow): CatalogEntry {
  const { published_at, ...property } = row
  return { property: { ...property, source: 'exin' }, publishedAt: parseDate(published_at) }
}

function mapHabiRow(row: HabiRow): CatalogEntry | null {
  const uuid = row.external_uuid?.trim()
  if (!uuid) return null
  const imageUrls = stringList(row.image_urls)
  const type = typeof row.property_type === 'string' && row.property_type.trim() ? row.property_type.trim() : 'Inmueble'
  const title = row.title?.trim() || `Inmueble Habi ${row.property_id?.trim() || uuid.slice(0, 8)}`
  return {
    property: {
      id: `habi:${uuid}`,
      verification_code: row.property_id?.trim() || uuid,
      slug: uuid,
      title,
      operation: 'sale',
      property_type: type,
      price: numberOrNull(row.sale_price),
      city: row.city,
      neighborhood: row.neighborhood,
      description: row.description,
      bedrooms: numberOrNull(row.room_count),
      bathrooms: numberOrNull(row.bathroom_count),
      garages: numberOrNull(row.garage_count),
      area_m2: numberOrNull(row.area),
      status: 'published',
      is_featured: false,
      cover_url: imageUrls[0] ?? null,
      source: 'habi',
      source_offset: row.source_offset ?? 0,
    },
    publishedAt: parseDate(row.publication_date),
  }
}

function matches(entry: CatalogEntry, filters: CatalogFilters, rentalsEnabled: boolean) {
  const property = entry.property
  if (!rentalsEnabled && property.operation === 'rent') return false
  if (filters.city && property.city !== filters.city) return false
  if (filters.type && property.property_type !== filters.type) return false
  if (filters.operation && property.operation !== filters.operation) return false
  if (filters.bedrooms !== undefined && (property.bedrooms === null || property.bedrooms < filters.bedrooms)) return false
  if (filters.bathrooms !== undefined && (property.bathrooms === null || property.bathrooms < filters.bathrooms)) return false
  if (filters.minArea !== undefined && (property.area_m2 === null || property.area_m2 < filters.minArea)) return false
  if (filters.maxArea !== undefined && (property.area_m2 === null || property.area_m2 > filters.maxArea)) return false
  const term = filters.query?.trim().toLocaleLowerCase()
  if (term) {
    const haystack = [property.title, property.city, property.neighborhood, property.verification_code]
      .filter(Boolean).join(' ').toLocaleLowerCase()
    if (!haystack.includes(term)) return false
  }
  return true
}

function sortEntries(entries: CatalogEntry[], sort?: string) {
  return entries.sort((left, right) => {
    if (sort === 'price_asc' || sort === 'price_desc') {
      const leftPrice = left.property.price
      const rightPrice = right.property.price
      if (leftPrice === null && rightPrice !== null) return 1
      if (rightPrice === null && leftPrice !== null) return -1
      if (leftPrice !== null && rightPrice !== null && leftPrice !== rightPrice) {
        return sort === 'price_asc' ? leftPrice - rightPrice : rightPrice - leftPrice
      }
    } else {
      if (left.publishedAt === null && right.publishedAt !== null) return 1
      if (right.publishedAt === null && left.publishedAt !== null) return -1
      if (left.publishedAt !== null && right.publishedAt !== null && left.publishedAt !== right.publishedAt) return right.publishedAt - left.publishedAt
    }
    return left.property.title.localeCompare(right.property.title, 'es')
  })
}

async function loadCatalog(rentalsEnabled: boolean) {
  if (!hasSupabasePublicEnv()) return { entries: [] as CatalogEntry[], unavailableSources: ['exin', 'habi'] as Array<'exin' | 'habi'> }

  const publicClient = createSupabasePublicClient()
  const exin = await readAllPages<ExinRow>(async (from, to) => {
    const { data, error } = await publicClient.from('properties')
      .select('id,verification_code,slug,title,operation,property_type,price,city,neighborhood,description,bedrooms,bathrooms,area_m2,status,is_featured,published_at')
      .eq('status', 'published')
      .range(from, to)
    return { data: data as ExinRow[] | null, error }
  })

  let habi = { rows: [] as HabiRow[], ok: true }
  try {
    const admin = createSupabaseAdminClient()
    habi = await readAllPages<HabiRow>(async (from, to) => {
      const { data, error } = await admin.from('habi_properties')
        .select('external_uuid,property_id,title,description,sale_price,area,room_count,bathroom_count,garage_count,property_type,city,neighborhood,image_urls,publication_date,source_offset')
        .eq('active', true)
        .not('external_uuid', 'is', null)
        .range(from, to)
      return { data: data as HabiRow[] | null, error }
    })
  } catch {
    habi = { rows: [], ok: false }
  }

  return {
    entries: [...exin.rows.map(mapExinRow), ...habi.rows.map(mapHabiRow).filter((entry): entry is CatalogEntry => Boolean(entry))],
    unavailableSources: [
      ...(!exin.ok ? ['exin' as const] : []),
      ...(!habi.ok ? ['habi' as const] : []),
    ],
  }
}

async function addExinCoverUrls(properties: Property[]) {
  const exinIds = properties.filter((property) => property.source === 'exin').map((property) => property.id)
  if (!exinIds.length || !hasSupabasePublicEnv()) return properties
  try {
    const supabase = createSupabasePublicClient()
    const { data } = await supabase.from('property_images')
      .select('property_id,storage_path')
      .in('property_id', exinIds)
      .eq('is_cover', true)
    const coverUrls = new Map((data ?? []).map((image) => [image.property_id, supabase.storage.from('property-images').getPublicUrl(image.storage_path).data.publicUrl]))
    return properties.map((property) => property.source === 'exin' ? { ...property, cover_url: coverUrls.get(property.id) ?? null } : property)
  } catch {
    return properties
  }
}

export async function getUnifiedCatalogPage(filters: CatalogFilters, rentalsEnabled: boolean, options?: { pageSize?: number; homeFeatured?: boolean }): Promise<CatalogResult> {
  const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 24))
  const page = Math.min(1_000, Math.max(1, Math.floor(filters.page || 1)))
  const { entries, unavailableSources } = await loadCatalog(rentalsEnabled)
  const cities = [...new Set(entries.map(({ property }) => property.city?.trim()).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, 'es'))
  const propertyTypes = [...new Set(entries.map(({ property }) => property.property_type.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))

  if (options?.homeFeatured) {
    const exinFeatured = sortEntries(entries.filter(({ property }) => property.source === 'exin' && property.is_featured), filters.sort)
    const habiLatest = sortEntries(entries.filter(({ property }) => property.source === 'habi'), filters.sort)
    const selected: CatalogEntry[] = []
    const exinLimit = habiLatest.length ? 3 : 5
    const habiLimit = exinFeatured.length ? 2 : 5
    for (let index = 0; selected.length < 5 && (index < exinLimit || index < habiLimit); index += 1) {
      if (index < exinLimit && exinFeatured[index]) selected.push(exinFeatured[index])
      if (index < habiLimit && habiLatest[index] && selected.length < 5) selected.push(habiLatest[index])
    }
    return { properties: await addExinCoverUrls(selected.map(({ property }) => property)), total: selected.length, page: 1, pageSize, cities, propertyTypes, unavailableSources }
  }

  const filtered = sortEntries(entries.filter((entry) => matches(entry, filters, rentalsEnabled)), filters.sort)
  const total = filtered.length
  const pageEntries = filtered.slice((page - 1) * pageSize, page * pageSize)
  const properties = await addExinCoverUrls(pageEntries.map(({ property }) => property))
  return { properties, total, page, pageSize, cities, propertyTypes, unavailableSources }
}
