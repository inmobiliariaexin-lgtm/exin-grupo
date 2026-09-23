'use server'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function requestPasswordResetAction(_previous: { error?: string; success?: string }, formData: FormData): Promise<{ error?: string; success?: string }> {
  const email = String(formData.get('email') || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { error: 'Escribe un correo válido.' }
  const supabase = await createSupabaseServerClient()
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://inmobiliariagrupoexin.com').replace(/\/$/, '')
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl}/admin/recuperar-contrasena/callback` })
  if (error) return { error: 'No pudimos procesar la solicitud. Inténtalo más tarde o contacta al administrador.' }
  return { success: 'Si existe una cuenta para ese correo, recibirás un enlace para cambiar la contraseña. Revisa también spam.' }
}

export async function updatePasswordAction(_previous: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const password = String(formData.get('password') || '')
  const confirmation = String(formData.get('confirmation') || '')
  if (password.length < 10 || password.length > 128) return { error: 'La contraseña debe tener entre 10 y 128 caracteres.' }
  if (password !== confirmation) return { error: 'Las contraseñas no coinciden.' }
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getClaims()
  if (!auth?.claims?.sub) return { error: 'El enlace venció o ya fue usado. Solicita uno nuevo.' }
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: 'No pudimos cambiar la contraseña. Solicita un enlace nuevo e inténtalo otra vez.' }
  await supabase.auth.signOut()
  redirect('/admin/login?contrasena=actualizada')
}

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
