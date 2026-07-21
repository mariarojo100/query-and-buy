/**
 * lib/sms/twilio-verify — phone OTP via Twilio Verify v2 (REST, no SDK).
 * ===========================================================================
 * Twilio Verify manages the OTP end-to-end: it generates, sends, stores, and
 * checks the code. We NEVER generate or persist an OTP ourselves — this module
 * only starts a verification and checks a submitted code. Secrets (auth token,
 * service SID) stay server-side and are never returned to the caller.
 *
 * Contract (verified via Context7, Verify v2):
 *   start: POST /v2/Services/{SID}/Verifications      { To, Channel }
 *   check: POST /v2/Services/{SID}/VerificationCheck   { To, Code }  -> { status }
 * Auth is HTTP Basic (AccountSid:AuthToken).
 */
import { logger } from '@/lib/logger'

const BASE = 'https://verify.twilio.com/v2/Services'

function config(): { accountSid: string; authToken: string; serviceSid: string } | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID
  if (!accountSid || !authToken || !serviceSid) return null
  return { accountSid, authToken, serviceSid }
}

/** True when Twilio Verify is configured (used to degrade the UI gracefully). */
export function isPhoneVerifyConfigured(): boolean {
  return config() !== null
}

function authHeader(accountSid: string, authToken: string): string {
  return 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
}

export type StartResult =
  | { ok: true }
  | { ok: false; reason: 'not_configured' | 'invalid_number' | 'rate_limited' | 'error' }

/** Start an SMS verification for an E.164 number. Never throws. */
export async function startVerification(phoneE164: string): Promise<StartResult> {
  const cfg = config()
  if (!cfg) {
    logger.warn('twilio-verify.start', 'not configured')
    return { ok: false, reason: 'not_configured' }
  }
  try {
    const res = await fetch(`${BASE}/${cfg.serviceSid}/Verifications`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(cfg.accountSid, cfg.authToken),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: phoneE164, Channel: 'sms' }).toString(),
    })
    if (res.ok) return { ok: true }

    const status = res.status
    // 429 = Twilio's own max-send-attempts guard; 400/60200 = unparseable number.
    if (status === 429) return { ok: false, reason: 'rate_limited' }
    if (status === 400) return { ok: false, reason: 'invalid_number' }
    logger.error('twilio-verify.start', 'send failed', { status })
    return { ok: false, reason: 'error' }
  } catch (e) {
    logger.error('twilio-verify.start', 'network error', {
      error: e instanceof Error ? e.message : 'unknown',
    })
    return { ok: false, reason: 'error' }
  }
}

export type CheckResult =
  | { approved: true }
  | { approved: false; reason: 'not_configured' | 'incorrect' | 'expired' | 'error' }

/**
 * Check a submitted code. `approved` iff Twilio returns status 'approved'.
 * A 404 means there is no pending verification (expired / already consumed).
 */
export async function checkVerification(phoneE164: string, code: string): Promise<CheckResult> {
  const cfg = config()
  if (!cfg) return { approved: false, reason: 'not_configured' }
  try {
    const res = await fetch(`${BASE}/${cfg.serviceSid}/VerificationCheck`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(cfg.accountSid, cfg.authToken),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: phoneE164, Code: code }).toString(),
    })
    if (res.status === 404) return { approved: false, reason: 'expired' }
    if (!res.ok) {
      logger.error('twilio-verify.check', 'check failed', { status: res.status })
      return { approved: false, reason: 'error' }
    }
    const data = (await res.json().catch(() => ({}))) as { status?: string }
    if (data.status === 'approved') return { approved: true }
    return { approved: false, reason: 'incorrect' }
  } catch (e) {
    logger.error('twilio-verify.check', 'network error', {
      error: e instanceof Error ? e.message : 'unknown',
    })
    return { approved: false, reason: 'error' }
  }
}
