'use server'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function signInAction(_previous: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const password = String(formData.get('password') || '')
  if (!email || !password) return { error: 'Ingresa tu correo y contraseña.' }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: 'No pudimos iniciar sesión. Verifica tus datos o contacta al administrador.' }
  const { data: auth } = await supabase.auth.getClaims()
  const userId = auth?.claims?.sub
  const { data: profile } = typeof userId === 'string' ? await supabase.from('profiles').select('active').eq('id', userId).maybeSingle() : { data: null }
  if (!profile?.active) {
    await supabase.auth.signOut()
    return { error: 'Esta cuenta no tiene acceso activo al panel.' }
  }
  redirect('/admin')
}
