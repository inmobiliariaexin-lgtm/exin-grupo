import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { hasSupabasePublicEnv, getSupabasePublicEnv } from './env'

export async function updateSession(request: NextRequest) {
  if (!hasSupabasePublicEnv()) return NextResponse.next({ request })
  const { url, key } = getSupabasePublicEnv()
  let response = NextResponse.next({ request })
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        for (const header of ['cache-control', 'expires', 'pragma']) {
          const value = headers?.get(header)
          if (value) response.headers.set(header, value)
        }
      },
    },
  })
  await supabase.auth.getClaims()
  return response
}
