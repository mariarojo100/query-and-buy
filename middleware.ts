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

/**
 * Renamed category slugs → their new slug. Emits a 301 to the new slug (at the
 * root, since category pages now live at /{slug} rather than /category/{slug}).
 * Keep in sync with the DB slug.
 */
const CATEGORY_SLUG_REDIRECTS: Record<string, string> = {
  commercial: 'commercial-property',
}

/** First path segment (or '' for root). */
function firstSegment(pathname: string): string {
  return pathname.split('/')[1] ?? ''
}

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

  // Category pages moved from /category/{slug} to /{slug}. 301 any legacy
  // /category/* URL to the root, stripping the prefix and applying any slug
  // rename (e.g. /category/commercial/dubai → /commercial-property/dubai).
  const legacyCat = pathname.match(/^\/category\/([^/]+)(\/.*)?$/)
  if (legacyCat) {
    const slug = CATEGORY_SLUG_REDIRECTS[legacyCat[1]] ?? legacyCat[1]
    const url = req.nextUrl.clone()
    url.pathname = `/${slug}${legacyCat[2] ?? ''}`
    return NextResponse.redirect(url, 301)
  }

  // Root-level renamed slugs (e.g. /commercial → /commercial-property). Only
  // fires for slugs explicitly in the rename map, so it never touches other
  // top-level routes.
  const rootSlug = firstSegment(pathname)
  if (CATEGORY_SLUG_REDIRECTS[rootSlug]) {
    const rest = pathname.slice(`/${rootSlug}`.length)
    const url = req.nextUrl.clone()
    url.pathname = `/${CATEGORY_SLUG_REDIRECTS[rootSlug]}${rest}`
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
