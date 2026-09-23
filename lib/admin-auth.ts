import 'server-only'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { AppRole } from '@/lib/types'

const knownRoles: AppRole[] = ['superadmin', 'admin', 'commercial', 'advisor', 'editor']

export async function getAdminContext() {
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getClaims()
  const userId = auth?.claims?.sub
  if (typeof userId !== 'string') return null
  const { data: profile } = await supabase.from('profiles').select('id,full_name,role,active').eq('id', userId).maybeSingle()
  if (!profile || !profile.active || !knownRoles.includes(profile.role as AppRole)) return null
  return { supabase, profile: profile as { id: string; full_name: string; role: AppRole; active: boolean } }
}

export async function requireAdminContext(roles?: AppRole[]) {
  const context = await getAdminContext()
  if (!context) redirect('/admin/login')
  if (roles && !roles.includes(context.profile.role)) redirect('/admin')
  return context
}
