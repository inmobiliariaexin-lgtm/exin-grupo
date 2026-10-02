import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { HABI_API_URL, normalizeHabiProperty, type HabiRawProperty } from '@/lib/habi-api'

const PAGE_SIZE = 100
const MAX_PAGES_PER_SYNC = 1_000
const API_TIMEOUT_MS = 15_000

export type HabiSyncError = 'not-configured' | 'unauthorized' | 'invalid-request' | 'unavailable' | 'invalid-response' | 'page-limit' | 'database-error'
export type HabiSyncResult = { ok: true; runId: string; received: number; saved: number; pages: number; total: number | null } | { ok: false; runId: string | null; error: HabiSyncError; received: number; saved: number; pages: number }

type ApiPayload = Record<string, unknown> & {
  body?: unknown
  success?: unknown
  total_properties?: unknown
  more_offset?: unknown
  more_available?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function apiErrorForStatus(status: number): HabiSyncError {
  if (status === 401 || status === 403) return 'unauthorized'
  if (status === 400 || status === 422) return 'invalid-request'
  return 'unavailable'
}

function prepareStoredRow(item: unknown, offset: number, index: number) {
  const record = isRecord(item) ? item as HabiRawProperty : null
  const externalUuid = record ? asText(record.uuid) : null
  const propertyId = record ? asText(record.property_id) : null
  const storageKey = externalUuid ? `uuid:${externalUuid}` : propertyId ? `property:${propertyId}` : `offset:${offset}:row:${index}`
  const mapped = record ? normalizeHabiProperty(record) : null
  const imageUrls = mapped?.gallery.map((image) => image.url) ?? []

  return {
    storage_key: storageKey,
    external_uuid: externalUuid,
    property_id: propertyId,
    title: record ? asText(record.title) : null,
    description: record ? asText(record.description) : null,
    sale_price: record ? asNumber(record.sale_price) : null,
    area: record ? asNumber(record.area) : null,
    room_count: record ? asNumber(record.room_count) : null,
    bathroom_count: record ? asNumber(record.bathroom_count) : null,
    garage_count: record ? asNumber(record.garage_count) : null,
    property_type: record && 'property_type' in record ? record.property_type : null,
    city: record ? asText(record.city) : null,
    neighborhood: record ? asText(record.neighborhood) : null,
    address: record ? asText(record.address) : null,
    image_urls: imageUrls,
    publication_date: record ? asText(record.publication_date) : null,
    source_offset: offset,
    raw_data: item,
  }
}

async function finishFailedRun(admin: ReturnType<typeof createSupabaseAdminClient>, runId: string | null, error: HabiSyncError, received: number, saved: number, pages: number, metadata: Record<string, unknown>[]) {
  if (runId) {
    await admin.from('habi_sync_runs').update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      properties_received: received,
      properties_saved: saved,
      pages_received: pages,
      response_metadata: metadata,
      error_code: error,
    }).eq('id', runId)
  }
  return { ok: false as const, runId, error, received, saved, pages }
}

/** Downloads every CO page, stores every body item verbatim in raw_data, and
 * retains the remaining response envelope in the sync-run history. */
export async function syncHabiCatalog(startedBy: string): Promise<HabiSyncResult> {
  const apiKey = process.env.HABI_API_KEY?.trim()
  if (!apiKey) return { ok: false, runId: null, error: 'not-configured', received: 0, saved: 0, pages: 0 }

  const admin = createSupabaseAdminClient()
  const { data: run, error: createError } = await admin.from('habi_sync_runs').insert({ started_by: startedBy }).select('id').single()
  if (createError || !run?.id) return { ok: false, runId: null, error: 'database-error', received: 0, saved: 0, pages: 0 }

  const runId = String(run.id)
  const responseMetadata: Record<string, unknown>[] = []
  let received = 0
  let saved = 0
  let pages = 0
  let total: number | null = null
  let offset = 0
  let completed = false

  try {
    while (pages < MAX_PAGES_PER_SYNC) {
      const url = new URL(HABI_API_URL)
      url.searchParams.set('country', 'CO')
      url.searchParams.set('offset', String(offset))
      url.searchParams.set('limit', String(PAGE_SIZE))

      let response: Response
      try {
        response = await fetch(url, { headers: { 'x-api-key': apiKey, accept: 'application/json' }, signal: AbortSignal.timeout(API_TIMEOUT_MS), cache: 'no-store' })
      } catch {
        return await finishFailedRun(admin, runId, 'unavailable', received, saved, pages, responseMetadata)
      }
      if (!response.ok) return await finishFailedRun(admin, runId, apiErrorForStatus(response.status), received, saved, pages, responseMetadata)

      let payload: ApiPayload
      try {
        payload = await response.json() as ApiPayload
      } catch {
        return await finishFailedRun(admin, runId, 'invalid-response', received, saved, pages, responseMetadata)
      }
      if (!Array.isArray(payload.body) || payload.success === false) {
        return await finishFailedRun(admin, runId, 'invalid-response', received, saved, pages, responseMetadata)
      }

      const batch = payload.body as unknown[]
      const metadata = { ...payload }
      delete metadata.body
      responseMetadata.push({ offset, metadata })
      pages += 1
      received += batch.length

      const pageTotal = asNumber(payload.total_properties)
      if (pageTotal !== null) total = Math.max(0, Math.floor(pageTotal))

      const deduplicated = new Map<string, ReturnType<typeof prepareStoredRow>>()
      batch.forEach((item, index) => {
        const row = prepareStoredRow(item, offset, index)
        deduplicated.set(row.storage_key, row)
      })
      const rows = [...deduplicated.values()]
      if (rows.length) {
        const { data, error } = await admin.from('habi_sync_staging').upsert(rows.map((row) => ({ ...row, run_id: runId })), { onConflict: 'run_id,storage_key' }).select('storage_key')
        if (error) return await finishFailedRun(admin, runId, 'database-error', received, saved, pages, responseMetadata)
        saved += data?.length ?? rows.length
      }

      const { error: progressError } = await admin.from('habi_sync_runs').update({
        properties_received: received,
        properties_saved: saved,
        pages_received: pages,
        total_reported: total,
        response_metadata: responseMetadata,
      }).eq('id', runId)
      if (progressError) return await finishFailedRun(admin, runId, 'database-error', received, saved, pages, responseMetadata)

      const moreOffset = asNumber(payload.more_offset)
      const hasMore = payload.more_available === true || (moreOffset !== null && moreOffset > offset)
      if (!hasMore) {
        if (total !== null && received < total) return await finishFailedRun(admin, runId, 'invalid-response', received, saved, pages, responseMetadata)
        completed = true
        break
      }

      const nextOffset = moreOffset !== null && moreOffset > offset ? Math.floor(moreOffset) : offset + batch.length
      if (nextOffset <= offset || batch.length === 0) return await finishFailedRun(admin, runId, 'invalid-response', received, saved, pages, responseMetadata)
      offset = nextOffset
    }

    if (!completed) return await finishFailedRun(admin, runId, 'page-limit', received, saved, pages, responseMetadata)

    const { count: uniqueSaved, error: stageCountError } = await admin.from('habi_sync_staging')
      .select('storage_key', { count: 'exact', head: true })
      .eq('run_id', runId)
    if (stageCountError) return await finishFailedRun(admin, runId, 'database-error', received, saved, pages, responseMetadata)
    saved = uniqueSaved ?? saved

    const { error: completeError } = await admin.rpc('finalize_habi_catalog_sync', {
      p_run_id: runId,
      p_properties_received: received,
      p_properties_saved: saved,
      p_pages_received: pages,
      p_total_reported: total,
      p_response_metadata: responseMetadata,
    })
    if (completeError) return await finishFailedRun(admin, runId, 'database-error', received, saved, pages, responseMetadata)

    return { ok: true, runId, received, saved, pages, total }
  } catch {
    return await finishFailedRun(admin, runId, 'unavailable', received, saved, pages, responseMetadata)
  }
}
