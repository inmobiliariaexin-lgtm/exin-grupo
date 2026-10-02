import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { getSupabasePublicEnv } from './env'

const PUBLIC_REQUEST_TIMEOUT_MS = 5_000

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(new Error('Supabase public request timed out')), PUBLIC_REQUEST_TIMEOUT_MS)
  const sourceSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined)
  const forwardAbort = () => controller.abort(sourceSignal?.reason)

  if (sourceSignal?.aborted) forwardAbort()
  else sourceSignal?.addEventListener('abort', forwardAbort, { once: true })

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
    sourceSignal?.removeEventListener('abort', forwardAbort)
  }
}

export function createSupabasePublicClient() {
  const { url, key } = getSupabasePublicEnv()
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchWithTimeout },
  })
}
