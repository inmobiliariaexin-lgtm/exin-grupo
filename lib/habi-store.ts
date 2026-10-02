import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { normalizeHabiProperty, type HabiCatalogResult, type HabiProperty, type HabiRawProperty } from '@/lib/habi-api'

type StoredHabiRow = {
  raw_data: unknown
  source_offset: number
}

function mapStoredProperty(row: StoredHabiRow): HabiProperty | null {
  if (typeof row.raw_data !== 'object' || row.raw_data === null || Array.isArray(row.raw_data)) return null
  const property = normalizeHabiProperty(row.raw_data as HabiRawProperty)
  return property ? { ...property, address: null, source_offset: row.source_offset } : null
}

export async function getStoredHabiProperties(offset = 0, limit = 24): Promise<HabiCatalogResult> {
  const safeOffset = Number.isSafeInteger(offset) ? Math.max(0, offset) : 0
  const safeLimit = Number.isSafeInteger(limit) ? Math.min(100, Math.max(1, limit)) : 24

  try {
    const admin = createSupabaseAdminClient()
    const { data, error, count } = await admin.from('habi_properties')
      .select('raw_data,source_offset', { count: 'exact' })
      .eq('active', true)
      .not('external_uuid', 'is', null)
      .order('publication_date', { ascending: false, nullsFirst: false })
      .range(safeOffset, safeOffset + safeLimit - 1)
    if (error) return { properties: [], total: 0, offset: safeOffset, limit: safeLimit, nextOffset: null, error: 'database-error' }

    const properties = ((data ?? []) as StoredHabiRow[]).map(mapStoredProperty).filter((property): property is HabiProperty => Boolean(property))
    const total = count ?? 0
    const nextOffset = safeOffset + safeLimit < total ? safeOffset + safeLimit : null
    return { properties, total, offset: safeOffset, limit: safeLimit, nextOffset, error: null }
  } catch {
    return { properties: [], total: 0, offset: safeOffset, limit: safeLimit, nextOffset: null, error: 'database-error' }
  }
}

export async function getStoredHabiProperty(uuid: string): Promise<HabiProperty | null> {
  try {
    const admin = createSupabaseAdminClient()
    const { data, error } = await admin.from('habi_properties')
      .select('raw_data,source_offset')
      .eq('external_uuid', uuid)
      .eq('active', true)
      .maybeSingle()
    if (error || !data) return null
    return mapStoredProperty(data as StoredHabiRow)
  } catch {
    return null
  }
}
