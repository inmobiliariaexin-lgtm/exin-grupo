export function hasSupabasePublicEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
}

export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('Falta configurar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.')
  return { url, key }
}

export function getSupabaseServerEnv() {
  const { url } = getSupabasePublicEnv()
  const key = process.env.SUPABASE_SECRET_KEY
  if (!key) throw new Error('Falta SUPABASE_SECRET_KEY en el entorno servidor.')
  return { url, key }
}
