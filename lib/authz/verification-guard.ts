/**
 * lib/authz/verification-guard — the phone-verification gate.
 * ===========================================================================
 * Phone verification is REQUIRED before a few high-trust actions (publishing a
 * listing, confirming an order → which unlocks contact details). Browsing,
 * login, signup and viewing listings are intentionally NOT gated.
 *
 * The gate lives in the shared service layer (lib/listings/write,
 * lib/orders/service) so BOTH the web actions and the mobile API enforce it —
 * a single source of truth. Source of truth for "verified" is
 * users.hasMobileVerified (see lib/db/auth#isPhoneVerified).
 */
import { isPhoneVerified } from '@/lib/db/auth'
import type { Viewer } from '@/lib/authz/viewer'

export const PHONE_REQUIRED_MESSAGE = 'Verify your phone number to continue.'

export type PhoneGate =
  | { ok: true }
  | { ok: false; error: string; needsPhoneVerification: true }

/** Allow only if the viewer's phone is verified; else a friendly, actionable deny. */
export async function requirePhoneVerified(viewer: Viewer): Promise<PhoneGate> {
  if (await isPhoneVerified(viewer.id)) return { ok: true }
  return { ok: false, error: PHONE_REQUIRED_MESSAGE, needsPhoneVerification: true }
}
