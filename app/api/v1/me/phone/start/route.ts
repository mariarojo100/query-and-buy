/**
 * POST /api/v1/me/phone/start — send an SMS OTP via Twilio Verify.
 * Mirrors app/account/verifyPhone/actions.ts#startPhoneVerification exactly
 * (same E.164 normalization, duplicate-phone guard, and rate limits) but
 * authenticated by bearer token instead of the web session. Twilio owns the
 * code — we never generate or store it.
 */
import { PhoneStartSchema } from '@qb/shared'
import { getApiViewer } from '@/lib/api/auth'
import { parseBody } from '@/lib/api/validate'
import { ok, fail, unauthorized, handle } from '@/lib/api/respond'
import { startVerification } from '@/lib/sms/twilio-verify'
import { normalizeE164 } from '@/lib/phone/e164'
import { findUserIdByPhone } from '@/lib/db/auth'
import { enforceRateLimit } from '@/lib/security/rateLimit'
import { logger } from '@/lib/logger'

// Same limits as the web action: 60s cooldown + 3 SMS / 15 min.
const SEND_COOLDOWN_MS = 60_000
const SEND_WINDOW_MAX = 3
const SEND_WINDOW_MS = 15 * 60 * 1000

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()

    const parsed = await parseBody(req, PhoneStartSchema)
    if (!parsed.ok) return parsed.response

    const e164 = normalizeE164(parsed.data.phone)
    if (!e164) {
      return fail('invalid_input', 'Enter your phone in international format, e.g. +9715XXXXXXXX.', 400)
    }

    // Rate-limit BEFORE the duplicate-phone lookup, so the 409 "already linked"
    // response can't be used to enumerate which numbers are registered.
    const cooldown = enforceRateLimit('phone-verify:cooldown', viewer.id, 1, SEND_COOLDOWN_MS)
    if (!cooldown.allowed) {
      return fail('rate_limited', 'Please wait before requesting another code.', 429, { retryAfterSec: cooldown.retryAfterSec })
    }
    const window = enforceRateLimit('phone-verify:send', viewer.id, SEND_WINDOW_MAX, SEND_WINDOW_MS)
    if (!window.allowed) {
      return fail('rate_limited', 'Too many codes requested. Try again later.', 429, { retryAfterSec: window.retryAfterSec })
    }

    const owner = await findUserIdByPhone(e164)
    if (owner && owner !== viewer.id) {
      return fail('conflict', 'That number is already linked to another account.', 409)
    }

    const res = await startVerification(e164)
    if (res.ok) {
      logger.audit('phone-verify.start', 'otp requested (mobile)', { userId: viewer.id })
      return ok({ sent: true })
    }
    switch (res.reason) {
      case 'invalid_number':
        return fail('invalid_input', 'That phone number doesn’t look valid. Please check and try again.', 400)
      case 'rate_limited':
        return fail('rate_limited', 'Too many attempts for this number. Please try again later.', 429)
      case 'not_configured':
      case 'error':
      default:
        return fail('server_error', 'Couldn’t send the code right now. Please try again shortly.', 502)
    }
  })
}
