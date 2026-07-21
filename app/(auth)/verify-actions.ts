'use server'

import { getViewer } from '@/lib/auth/session'
import { resendVerificationEmail, changeEmail } from '@/lib/auth/email-verify'

export type VerifyActionResult = { ok?: boolean; error?: string; retryAfterSec?: number }

/**
 * Resend the email-verification link to the signed-in user. Rate-limited in
 * lib/auth/email-verify (60s cooldown + 3 / 15 min). Errors are generic.
 */
export async function resendVerificationAction(): Promise<VerifyActionResult> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'Please sign in to resend your verification email.' }

  const res = await resendVerificationEmail(viewer.id)
  if (res.ok) return { ok: true }
  switch (res.reason) {
    case 'already_verified':
      return { ok: true } // idempotent from the user's view; nothing to do
    case 'rate_limited':
      return { error: 'Please wait a moment before requesting another email.', retryAfterSec: res.retryAfterSec }
    case 'no_email':
    default:
      return { error: 'We couldn’t send the email. Please try again.' }
  }
}

/**
 * Change the (still-unverified) email of the signed-in user and send a fresh
 * link. Rate-limited on the same send budget as resend.
 */
export async function changeEmailAction(newEmail: string): Promise<VerifyActionResult> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'Please sign in to change your email.' }

  const res = await changeEmail(viewer.id, newEmail)
  if (res.ok) return { ok: true }
  switch (res.reason) {
    case 'invalid':
      return { error: 'Enter a valid email address.' }
    case 'unchanged':
      return { error: 'That’s already your email address.' }
    case 'already_verified':
      return { error: 'Your email is already verified and can’t be changed here.' }
    case 'rate_limited':
      return { error: 'Please wait a moment before trying again.', retryAfterSec: res.retryAfterSec }
    case 'taken':
    default:
      // Generic — never reveal whether an email is registered.
      return { error: 'We couldn’t update your email. Please try a different address.' }
  }
}
