import { type NextRequest, NextResponse } from 'next/server'
import { redeemToken } from '@/lib/auth/tokens'
import { markEmailVerified } from '@/lib/db/auth'

/**
 * Email verification handler. The verification email links here with a raw
 * `token`; we redeem it (single-use) and mirror the verified state into
 * users + profiles (replacing the sync_email_verified trigger).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const next =
    searchParams.get('next') ??
    '/login?message=' + encodeURIComponent('Email confirmed — you can now sign in.')

  if (token) {
    const redeemed = await redeemToken(token, 'email_verify')
    if (redeemed) {
      await markEmailVerified(redeemed.userId)
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  return NextResponse.redirect(
    new URL('/login?message=Could not confirm — the link may have expired', request.url),
  )
}
