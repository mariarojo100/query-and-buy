/**
 * POST /api/v1/me/phone/verify — confirm the SMS OTP with Twilio Verify and,
 * on approval, mark the phone verified (users + profiles). Mirrors
 * app/account/verifyPhone/actions.ts#confirmPhoneVerification, bearer-authed.
 */
import { PhoneVerifySchema } from '@qb/shared'
import { getApiViewer } from '@/lib/api/auth'
import { parseBody } from '@/lib/api/validate'
import { ok, fail, unauthorized, handle } from '@/lib/api/respond'
import { checkVerification } from '@/lib/sms/twilio-verify'
import { normalizeE164 } from '@/lib/phone/e164'
import { findUserIdByPhone, markPhoneVerified } from '@/lib/db/auth'
import { enforceRateLimit } from '@/lib/security/rateLimit'
import { logger } from '@/lib/logger'

// Same as the web action: 5 check attempts / 15 min.
const CHECK_MAX_ATTEMPTS = 5
const CHECK_WINDOW_MS = 15 * 60 * 1000

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()

    const parsed = await parseBody(req, PhoneVerifySchema)
    if (!parsed.ok) return parsed.response

    const e164 = normalizeE164(parsed.data.phone)
    if (!e164) {
      return fail('invalid_input', 'Enter your phone in international format, e.g. +9715XXXXXXXX.', 400)
    }

    const attempts = enforceRateLimit('phone-verify:check', viewer.id, CHECK_MAX_ATTEMPTS, CHECK_WINDOW_MS)
    if (!attempts.allowed) {
      logger.security('phone-verify.check', 'attempt limit hit (mobile)', { userId: viewer.id })
      return fail('rate_limited', 'Too many incorrect attempts. Request a new code and try again.', 429, { retryAfterSec: attempts.retryAfterSec })
    }

    // Guard against a race where the number was claimed since the code was sent.
    const owner = await findUserIdByPhone(e164)
    if (owner && owner !== viewer.id) {
      return fail('conflict', 'That number is already linked to another account.', 409)
    }

    const result = await checkVerification(e164, parsed.data.code)
    if (!result.approved) {
      switch (result.reason) {
        case 'expired':
          return fail('invalid_input', 'That code has expired. Request a new one.', 400)
        case 'not_configured':
        case 'error':
          return fail('server_error', 'Couldn’t verify the code right now. Please try again shortly.', 502)
        case 'incorrect':
        default:
          return fail('invalid_input', 'That code is invalid. Please try again.', 400)
      }
    }

    try {
      await markPhoneVerified(viewer.id, e164)
    } catch {
      // Unique-constraint race on phone_e164 → another account grabbed it.
      return fail('conflict', 'That number is already linked to another account.', 409)
    }

    logger.audit('phone-verify.confirm', 'phone verified (mobile)', { userId: viewer.id })
    return ok({ verified: true, phoneE164: e164 })
  })
}
