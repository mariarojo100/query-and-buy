import { type NextRequest, NextResponse } from 'next/server'

/**
 * Legacy alias. Email verification moved to /verify-email (a single canonical
 * route that redeems the token AND renders the result states). Links already
 * sent to /auth/confirm?token=… are forwarded there unchanged; no token is
 * redeemed here.
 */
export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const target = new URL('/verify-email', request.url)
  if (token) target.searchParams.set('token', token)
  return NextResponse.redirect(target)
}
