import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { HABI_API_URL, normalizeHabiProperty, type HabiRawProperty } from '@/lib/habi-api'

const PAGE_SIZE = 100
const MAX_PAGES_PER_SYNC = 1_000
const API_TIMEOUT_MS = 15_000

export type HabiSyncError = 'not-configured' | 'not-owner' | 'unauthorized' | 'invalid-request' | 'unavailable' | 'invalid-response' | 'page-limit' | 'database-error'
export type HabiSyncProgress = {
  ok: boolean
  runId: string | null
  status: 'running' | 'succeeded' | 'failed'
  received: number
  saved: number
  pages: number
  total: number | null
  error?: HabiSyncError
}

type ApiPayload = Record<string, unknown> & {
  body?: unknown
  success?: unknown
  total_properties?: unknown
  more_offset?: unknown
  more_available?: unknown
}

type StoredPage = { offset: number; batch_size?: number; metadata?: Record<string, unknown> }

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

function progress(runId: string | null, status: HabiSyncProgress['status'], received: number, saved: number, pages: number, total: number | null, error?: HabiSyncError): HabiSyncProgress {
  return { ok: status !== 'failed', runId, status, received, saved, pages, total, ...(error ? { error } : {}) }
}

async function finishFailedRun(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  runId: string,
  error: HabiSyncError,
  received: number,
  saved: number,
  pages: number,
  total: number | null,
  metadata: Record<string, unknown>[],
) {
  await admin.from('habi_sync_runs').update({
    status: 'failed',
    finished_at: new Date().toISOString(),
    properties_received: received,
    properties_saved: saved,
    pages_received: pages,
    total_reported: total,
    response_metadata: metadata,
    error_code: error,
  }).eq('id', runId)
  return progress(runId, 'failed', received, saved, pages, total, error)
}

export async function startHabiCatalogSync(startedBy: string): Promise<HabiSyncProgress> {
  if (!process.env.HABI_API_KEY?.trim()) return progress(null, 'failed', 0, 0, 0, null, 'not-configured')

  const admin = createSupabaseAdminClient()
  const { data: run, error } = await admin.from('habi_sync_runs').insert({ started_by: startedBy }).select('id').single()
  if (error || !run?.id) return progress(null, 'failed', 0, 0, 0, null, 'database-error')
  return progress(String(run.id), 'running', 0, 0, 0, null)
}

/** Processes one Habi page per request. This keeps each Cloudflare Worker
 * invocation below the Free plan's external subrequest limit and permits the
 * admin screen to resume an interrupted import from its saved offset. */
export async function advanceHabiCatalogSync(runId: string, startedBy: string): Promise<HabiSyncProgress> {
  const apiKey = process.env.HABI_API_KEY?.trim()
  const admin = createSupabaseAdminClient()
  const { data: run, error: runError } = await admin.from('habi_sync_runs')
    .select('id,status,started_by,properties_received,properties_saved,pages_received,total_reported,response_metadata')
    .eq('id', runId)
    .maybeSingle()

  if (runError || !run) return progress(runId, 'failed', 0, 0, 0, null, 'database-error')
  const received = Number(run.properties_received ?? 0)
  const saved = Number(run.properties_saved ?? 0)
  const pages = Number(run.pages_received ?? 0)
  const totalValue = asNumber(run.total_reported)
  const total = totalValue === null ? null : Math.max(0, Math.floor(totalValue))
  const storedMetadata = Array.isArray(run.response_metadata) ? run.response_metadata.filter(isRecord) : []

  if (run.started_by !== startedBy) return progress(runId, 'failed', received, saved, pages, total, 'not-owner')
  if (run.status === 'succeeded') return progress(runId, 'succeeded', received, saved, pages, total)
  if (run.status !== 'running') return progress(runId, 'failed', received, saved, pages, total, 'unavailable')
  if (!apiKey) return finishFailedRun(admin, runId, 'not-configured', received, saved, pages, total, storedMetadata)
  if (pages >= MAX_PAGES_PER_SYNC) return finishFailedRun(admin, runId, 'page-limit', received, saved, pages, total, storedMetadata)

  const lastEntry = storedMetadata.length ? storedMetadata[storedMetadata.length - 1] as StoredPage : null
  const lastOffset = lastEntry && Number.isFinite(lastEntry.offset) ? lastEntry.offset : 0
  const lastPageMetadata = lastEntry && isRecord(lastEntry.metadata) ? lastEntry.metadata : {}
  const lastMoreOffset = asNumber(lastPageMetadata.more_offset)
  const lastHasMore = lastPageMetadata.more_available === true || (lastMoreOffset !== null && lastMoreOffset > lastOffset)

  // If an earlier one-request import stopped after its final page but before
  // committing, finish that saved copy instead of downloading the last page again.
  if (pages > 0 && !lastHasMore && (total === null || received >= total)) {
    return finalizeRun(admin, runId, received, saved, pages, total, storedMetadata)
  }

  let offset = 0
  if (lastEntry) {
    const priorBatchSize = asNumber(lastEntry.batch_size)
    const fallbackBatchSize = priorBatchSize ?? Math.max(0, received - lastOffset)
    offset = lastMoreOffset !== null && lastMoreOffset > lastOffset
      ? Math.floor(lastMoreOffset)
      : lastOffset + fallbackBatchSize
  }

  const url = new URL(HABI_API_URL)
  url.searchParams.set('country', 'CO')
  url.searchParams.set('offset', String(offset))
  url.searchParams.set('limit', String(PAGE_SIZE))

  let response: Response
  try {
    response = await fetch(url, { headers: { 'x-api-key': apiKey, accept: 'application/json' }, signal: AbortSignal.timeout(API_TIMEOUT_MS), cache: 'no-store' })
  } catch {
    return finishFailedRun(admin, runId, 'unavailable', received, saved, pages, total, storedMetadata)
  }
  if (!response.ok) return finishFailedRun(admin, runId, apiErrorForStatus(response.status), received, saved, pages, total, storedMetadata)

  let payload: ApiPayload
  try {
    payload = await response.json() as ApiPayload
  } catch {
    return finishFailedRun(admin, runId, 'invalid-response', received, saved, pages, total, storedMetadata)
  }
  if (!Array.isArray(payload.body) || payload.success === false) {
    return finishFailedRun(admin, runId, 'invalid-response', received, saved, pages, total, storedMetadata)
  }

  const batch = payload.body as unknown[]
  const metadata = { ...payload }
  delete metadata.body
  const nextMetadata = [...storedMetadata, { offset, batch_size: batch.length, metadata }]
  const pageNumber = pages + 1
  const nextReceived = received + batch.length
  const pageTotal = asNumber(payload.total_properties)
  const nextTotal = pageTotal === null ? total : Math.max(0, Math.floor(pageTotal))

  const deduplicated = new Map<string, ReturnType<typeof prepareStoredRow>>()
  batch.forEach((item, index) => {
    const row = prepareStoredRow(item, offset, index)
    deduplicated.set(row.storage_key, row)
  })
  const rows = [...deduplicated.values()]
  let nextSaved = saved
  if (rows.length) {
    const { error } = await admin.from('habi_sync_staging').upsert(rows.map((row) => ({ ...row, run_id: runId })), { onConflict: 'run_id,storage_key' })
    if (error) return finishFailedRun(admin, runId, 'database-error', nextReceived, saved, pageNumber, nextTotal, nextMetadata)
    nextSaved += rows.length
  }

  const { error: updateError } = await admin.from('habi_sync_runs').update({
    properties_received: nextReceived,
    properties_saved: nextSaved,
    pages_received: pageNumber,
    total_reported: nextTotal,
    response_metadata: nextMetadata,
  }).eq('id', runId)
  if (updateError) return finishFailedRun(admin, runId, 'database-error', nextReceived, nextSaved, pageNumber, nextTotal, nextMetadata)

  const moreOffset = asNumber(payload.more_offset)
  const hasMore = payload.more_available === true || (moreOffset !== null && moreOffset > offset)
  if (hasMore) {
    const nextOffset = moreOffset !== null && moreOffset > offset ? Math.floor(moreOffset) : offset + batch.length
    if (nextOffset <= offset || batch.length === 0) return finishFailedRun(admin, runId, 'invalid-response', nextReceived, nextSaved, pageNumber, nextTotal, nextMetadata)
    return progress(runId, 'running', nextReceived, nextSaved, pageNumber, nextTotal)
  }

  if (nextTotal !== null && nextReceived < nextTotal) {
    return finishFailedRun(admin, runId, 'invalid-response', nextReceived, nextSaved, pageNumber, nextTotal, nextMetadata)
  }

  return finalizeRun(admin, runId, nextReceived, nextSaved, pageNumber, nextTotal, nextMetadata)
}

async function finalizeRun(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  runId: string,
  received: number,
  saved: number,
  pages: number,
  total: number | null,
  metadata: Record<string, unknown>[],
): Promise<HabiSyncProgress> {
  const { count: uniqueSaved, error: countError } = await admin.from('habi_sync_staging')
    .select('storage_key', { count: 'exact', head: true })
    .eq('run_id', runId)
  if (countError) return finishFailedRun(admin, runId, 'database-error', received, saved, pages, total, metadata)
  const finalSaved = uniqueSaved ?? saved

  const { error } = await admin.rpc('finalize_habi_catalog_sync', {
    p_run_id: runId,
    p_properties_received: received,
    p_properties_saved: finalSaved,
    p_pages_received: pages,
    p_total_reported: total,
    p_response_metadata: metadata,
  })
  if (error) return finishFailedRun(admin, runId, 'database-error', received, finalSaved, pages, total, metadata)
  return progress(runId, 'succeeded', received, finalSaved, pages, total)
}
