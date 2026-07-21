'use server'

import { revalidatePath } from 'next/cache'
import { getViewer } from '@/lib/auth/session'
import { startVerification, checkVerification } from '@/lib/sms/twilio-verify'
import { normalizeE164 } from '@/lib/phone/e164'
import { getVerificationState, findUserIdByPhone, markPhoneVerified } from '@/lib/db/auth'
import { enforceRateLimit } from '@/lib/security/rateLimit'
import { logger } from '@/lib/logger'

export type PhoneActionResult = { ok?: boolean; error?: string; retryAfterSec?: number }

// Rate limits (spec): 60s cooldown + 3 SMS / 15 min for sends; 5 attempts for checks.
const SEND_COOLDOWN_MS = 60_000
const SEND_WINDOW_MAX = 3
const SEND_WINDOW_MS = 15 * 60 * 1000
const CHECK_MAX_ATTEMPTS = 5
const CHECK_WINDOW_MS = 15 * 60 * 1000

const CODE_RE = /^\d{4,8}$/

/**
 * Step 1 — send an OTP via Twilio Verify. Twilio owns the code; we never
 * generate or store it. Rate-limited (60s cooldown + 3 / 15 min). Rejects a
 * number already verified by a different account.
 */
export async function startPhoneVerification(phone: string): Promise<PhoneActionResult> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }

  const e164 = normalizeE164(phone)
  if (!e164) {
    return { error: 'Enter your phone in international format, e.g. +9715XXXXXXXX.' }
  }

  const owner = await findUserIdByPhone(e164)
  if (owner && owner !== viewer.id) {
    return { error: 'That number is already linked to another account.' }
  }

  const cooldown = enforceRateLimit('phone-verify:cooldown', viewer.id, 1, SEND_COOLDOWN_MS)
  if (!cooldown.allowed) return { error: 'Please wait before requesting another code.', retryAfterSec: cooldown.retryAfterSec }
  const window = enforceRateLimit('phone-verify:send', viewer.id, SEND_WINDOW_MAX, SEND_WINDOW_MS)
  if (!window.allowed) return { error: 'Too many codes requested. Try again later.', retryAfterSec: window.retryAfterSec }

  const res = await startVerification(e164)
  if (res.ok) {
    logger.audit('phone-verify.start', 'otp requested', { userId: viewer.id })
    return { ok: true }
  }
  switch (res.reason) {
    case 'invalid_number':
      return { error: 'That phone number doesn’t look valid. Please check and try again.' }
    case 'rate_limited':
      return { error: 'Too many attempts for this number. Please try again later.' }
    case 'not_configured':
    case 'error':
    default:
      return { error: 'Couldn’t send the code right now. Please try again shortly.' }
  }
}

/**
 * Step 2 — confirm the code with Twilio Verify. On approval, mark the phone
 * verified (users + profiles) atomically. Attempts are rate-limited to 5 / 15 min.
 */
export async function confirmPhoneVerification(
  phone: string,
  token: string,
): Promise<PhoneActionResult> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }

  const e164 = normalizeE164(phone)
  if (!e164) return { error: 'Enter your phone in international format, e.g. +9715XXXXXXXX.' }

  const code = token.trim()
  if (!CODE_RE.test(code)) return { error: 'Enter the verification code from the SMS.' }

  const attempts = enforceRateLimit('phone-verify:check', viewer.id, CHECK_MAX_ATTEMPTS, CHECK_WINDOW_MS)
  if (!attempts.allowed) {
    logger.security('phone-verify.check', 'attempt limit hit', { userId: viewer.id })
    return { error: 'Too many incorrect attempts. Request a new code and try again.', retryAfterSec: attempts.retryAfterSec }
  }

  // Guard against a race where the number was claimed since step 1.
  const owner = await findUserIdByPhone(e164)
  if (owner && owner !== viewer.id) {
    return { error: 'That number is already linked to another account.' }
  }

  const result = await checkVerification(e164, code)
  if (!result.approved) {
    switch (result.reason) {
      case 'expired':
        return { error: 'That code has expired. Request a new one.' }
      case 'not_configured':
      case 'error':
        return { error: 'Couldn’t verify the code right now. Please try again shortly.' }
      case 'incorrect':
      default:
        return { error: 'That code is invalid. Please try again.' }
    }
  }

  try {
    await markPhoneVerified(viewer.id, e164)
  } catch {
    // Unique-constraint race on phone_e164 → another account grabbed it.
    return { error: 'That number is already linked to another account.' }
  }

  logger.audit('phone-verify.confirm', 'phone verified', { userId: viewer.id })
  revalidatePath('/account')
  revalidatePath('/account/settings')
  return { ok: true }
}

/** Current phone verification state for the settings UI. */
export async function getPhoneState(): Promise<{ phoneE164: string | null; verified: boolean } | null> {
  const viewer = await getViewer()
  if (!viewer) return null
  const state = await getVerificationState(viewer.id)
  if (!state) return null
  return { phoneE164: state.phoneE164, verified: state.phoneVerified }
}
