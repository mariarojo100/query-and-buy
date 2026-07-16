/**
 * lib/auth/email-verify — email verification orchestration.
 * ===========================================================================
 * The application-level state machine for confirming a user's email:
 *   - resend a verification link (rate-limited: 60s cooldown + 3 / 15 min)
 *   - verify a token from the /verify-email link (single-use, hashed)
 *   - change the email of an as-yet-unverified account, then re-send
 *
 * Only token HASHES are ever stored (lib/auth/tokens); raw tokens live only in
 * the emailed link. Verified STATE is the existing users.has_email_verified
 * boolean (mirrored on profiles). Every send invalidates the user's prior
 * unused email-verify tokens so only the newest link works.
 */
import { issueToken, redeemEmailVerifyToken } from '@/lib/auth/tokens'
import { sendVerificationEmail } from '@/lib/email/auth-emails'
import {
  getVerificationState,
  invalidateVerificationTokens,
  markEmailVerified,
  changeUnverifiedEmail,
  type EmailTokenOutcome,
} from '@/lib/db/auth'
import { enforceRateLimit } from '@/lib/security/rateLimit'
import { logger } from '@/lib/logger'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Rate limits (spec): 60s cooldown, and at most 3 sends per 15 minutes.
const COOLDOWN_MS = 60_000
const WINDOW_MAX = 3
const WINDOW_MS = 15 * 60 * 1000

export type ResendResult =
  | { ok: true }
  | { ok: false; reason: 'already_verified' | 'no_email' | 'rate_limited'; retryAfterSec?: number }

export type ChangeEmailResult =
  | { ok: true }
  | {
      ok: false
      reason: 'invalid' | 'taken' | 'already_verified' | 'unchanged' | 'rate_limited'
      retryAfterSec?: number
    }

/**
 * Enforce the resend cooldown + window for a user. Returns retryAfterSec when
 * blocked, else null. Two independent buckets so both bounds apply.
 */
function checkSendLimit(userId: string): number | null {
  const cooldown = enforceRateLimit('email-verify:cooldown', userId, 1, COOLDOWN_MS)
  if (!cooldown.allowed) return cooldown.retryAfterSec
  const window = enforceRateLimit('email-verify:window', userId, WINDOW_MAX, WINDOW_MS)
  if (!window.allowed) return window.retryAfterSec
  return null
}

/** (Re)issue and send a verification link. Invalidates prior unused tokens first. */
async function issueAndSend(userId: string, email: string): Promise<void> {
  await invalidateVerificationTokens(userId, 'email_verify')
  const token = await issueToken(userId, 'email_verify')
  await sendVerificationEmail(email, token)
}

/** Resend the verification email for the signed-in user. Rate-limited. */
export async function resendVerificationEmail(userId: string): Promise<ResendResult> {
  const state = await getVerificationState(userId)
  if (!state || !state.email) return { ok: false, reason: 'no_email' }
  if (state.emailVerified) return { ok: false, reason: 'already_verified' }

  const retryAfterSec = checkSendLimit(userId)
  if (retryAfterSec != null) {
    logger.security('email-verify.resend', 'rate limited', { userId })
    return { ok: false, reason: 'rate_limited', retryAfterSec }
  }

  await issueAndSend(userId, state.email)
  logger.audit('email-verify.resend', 'verification email re-sent', { userId })
  return { ok: true }
}

/** Verify an email-confirmation token and mark the account verified on success. */
export async function verifyEmail(rawToken: string): Promise<EmailTokenOutcome> {
  const outcome = await redeemEmailVerifyToken(rawToken)
  if (outcome.status === 'ok') {
    await markEmailVerified(outcome.userId)
    // Any other still-outstanding links are now moot.
    await invalidateVerificationTokens(outcome.userId, 'email_verify')
    logger.audit('email-verify.confirm', 'email verified', { userId: outcome.userId })
  }
  return outcome
}

/**
 * Change an unverified account's email, then send a fresh link. Rate-limited on
 * the same send budget as resend. Verified accounts cannot silently swap email
 * through this flow.
 */
export async function changeEmail(userId: string, rawEmail: string): Promise<ChangeEmailResult> {
  const email = rawEmail.trim().toLowerCase()
  if (!EMAIL_RE.test(email)) return { ok: false, reason: 'invalid' }

  const state = await getVerificationState(userId)
  if (!state) return { ok: false, reason: 'invalid' }
  if (state.emailVerified) return { ok: false, reason: 'already_verified' }
  if (state.email && state.email.toLowerCase() === email) return { ok: false, reason: 'unchanged' }

  const retryAfterSec = checkSendLimit(userId)
  if (retryAfterSec != null) return { ok: false, reason: 'rate_limited', retryAfterSec }

  const changed = await changeUnverifiedEmail(userId, email)
  if (!changed) {
    // Generic: don't confirm/deny which emails are registered.
    logger.security('email-verify.change', 'email change collided', { userId })
    return { ok: false, reason: 'taken' }
  }

  await issueAndSend(userId, email)
  logger.audit('email-verify.change', 'email changed + re-sent', { userId })
  return { ok: true }
}
