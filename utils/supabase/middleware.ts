import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Paths that require an authenticated user. */
const PROTECTED_PREFIXES = [
  '/account',
  '/sell',
  '/messages',
  '/favorites',
  '/saved-searches',
  '/notifications',
  '/admin',
]

/**
 * Refreshes the Supabase session on every request (token rotation) and
 * enforces route protection. Must run in middleware so Server Components
 * always see a fresh session. Source: @supabase/ssr Next.js guide.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: do not run code between createServerClient and getUser() — it
  // keeps the session fresh and avoids hard-to-debug logout bugs.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Logged-in users shouldn't sit on the auth pages — send them where they were
  // headed (?redirectTo) or home. Prevents the post-OAuth "stuck on /login" loop.
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    const redirectTo = request.nextUrl.searchParams.get('redirectTo')
    url.pathname = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/'
    url.search = ''
    const redirect = NextResponse.redirect(url)
    // Carry over any refreshed auth cookies so the session isn't dropped.
    supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c))
    return redirect
  }

  // Must return supabaseResponse as-is so refreshed auth cookies are preserved.
  return supabaseResponse
}
