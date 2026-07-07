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

export default auth((req) => {
  const { pathname } = req.nextUrl
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
