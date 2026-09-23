import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { AppRole } from '@/lib/types'

export async function verifyApiAdmin(allowedRoles: AppRole[]) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: auth } = await supabase.auth.getClaims()
    const userId = auth?.claims?.sub
    if (typeof userId !== 'string') return null
    const { data: profile } = await supabase.from('profiles').select('id,role,active').eq('id', userId).maybeSingle()
    if (!profile?.active || !allowedRoles.includes(profile.role as AppRole)) return null
    return { userId, role: profile.role as AppRole }
  } catch { return null }
}
