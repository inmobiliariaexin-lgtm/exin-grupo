import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/admin/recuperar-contrasena?error=enlace', request.url))
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  return NextResponse.redirect(new URL(error ? '/admin/recuperar-contrasena?error=enlace' : '/admin/nueva-contrasena', request.url))
}
