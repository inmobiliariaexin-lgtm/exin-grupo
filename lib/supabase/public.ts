import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { getSupabasePublicEnv } from './env'

export function createSupabasePublicClient() {
  const { url, key } = getSupabasePublicEnv()
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}
