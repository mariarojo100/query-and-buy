import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/lib/auth/config'

const { auth } = NextAuth(authConfig)

/** Paths that require an authenticated user (unchanged from the Supabase middleware). */
const PROTECTED_PREFIXES = [
  '/account',
  '/sell',
  '/messages',
  '/favorites',
  '/saved-searches',
  '/notifications',
  '/admin',
]

/** Canonical host — the apex every <link rel="canonical"> already points to. */
const CANONICAL_HOST = 'queryandbuy.com'

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Canonical host: 301-redirect www.queryandbuy.com → queryandbuy.com so the
  // apex is the single indexed host. A 301 (permanent) is emitted explicitly —
  // Next's config-level redirects() only offers 308, and the SEO audit asked
  // for a classic 301. Guard against a loop: only redirect when the host is the
  // www variant, never the apex itself.
  const host = (req.headers.get('host') ?? '').toLowerCase()
  if (host === `www.${CANONICAL_HOST}`) {
    const url = req.nextUrl.clone()
    url.protocol = 'https:'
    url.host = CANONICAL_HOST
    url.port = ''
    return NextResponse.redirect(url, 301)
  }

  const isLoggedIn = Boolean(req.auth?.user)
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (!isLoggedIn && isProtected) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Logged-in users shouldn't sit on the auth pages — send them where they were
  // headed (?redirectTo) or home.
  if (isLoggedIn && (pathname === '/login' || pathname === '/signup')) {
    const url = req.nextUrl.clone()
    const redirectTo = req.nextUrl.searchParams.get('redirectTo')
    url.pathname = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Run on all request paths except:
     * - api/auth (Auth.js endpoints)
     * - _next/static, _next/image, favicon.ico, image asset files
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
