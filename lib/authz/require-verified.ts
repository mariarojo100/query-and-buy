/**
 * lib/authz/require-verified — the "verify your email to transact" gate.
 * ===========================================================================
 * Browsing and signing in are open, but the value-bearing actions — listing an
 * item for sale, contacting a seller, and making an offer — require a confirmed
 * email. This is the single source of that rule so the message and the check
 * never drift across the sell / buy entry points (app/sell, app/messages,
 * app/orders). Returns a structured signal (never throws) that each server
 * action folds into its own result shape; `needVerify` lets the client surface
 * a "resend confirmation" affordance.
 */
import type { Viewer } from '@/lib/authz/viewer'

export const VERIFY_EMAIL_MESSAGE =
  'Please confirm your email address first. Check your inbox for the confirmation link — you can resend it from your account page.'

/**
 * Returns a blocking result when the viewer has not confirmed their email, or
 * null when they may proceed. Callers spread the result into their own return
 * value: `const gate = emailUnverified(viewer); if (gate) return gate`.
 */
export function emailUnverified(viewer: Viewer): { error: string; needVerify: true } | null {
  return viewer.emailVerified ? null : { error: VERIFY_EMAIL_MESSAGE, needVerify: true }
}
