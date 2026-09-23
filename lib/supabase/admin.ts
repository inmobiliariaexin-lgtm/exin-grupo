import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerEnv } from './env'

export function createSupabaseAdminClient() {
  const { url, key } = getSupabaseServerEnv()
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}
