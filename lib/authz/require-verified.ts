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
import { isPhoneVerified } from '@/lib/db/auth'

export const VERIFY_EMAIL_MESSAGE =
  'Please confirm your email address first. Check your inbox for the confirmation link — you can resend it from your account page.'

export const VERIFY_PHONE_MESSAGE =
  'Please verify your phone number first. You can add and verify it from your account settings.'

/**
 * Returns a blocking result when the viewer has not confirmed their email, or
 * null when they may proceed. Callers spread the result into their own return
 * value: `const gate = emailUnverified(viewer); if (gate) return gate`.
 */
export function emailUnverified(viewer: Viewer): { error: string; needVerify: true } | null {
  return viewer.emailVerified ? null : { error: VERIFY_EMAIL_MESSAGE, needVerify: true }
}

/**
 * Phone equivalent of emailUnverified for the actions that require a verified
 * phone (publishing a listing, confirming an order → which unlocks contact
 * details). Async because phone-verified state isn't carried on the Viewer;
 * it's read from users.has_mobile_verified. `needPhoneVerify` lets the client
 * route the user to phone verification in account settings.
 */
export async function phoneUnverified(
  viewer: Viewer,
): Promise<{ error: string; needPhoneVerify: true } | null> {
  return (await isPhoneVerified(viewer.id))
    ? null
    : { error: VERIFY_PHONE_MESSAGE, needPhoneVerify: true }
}
