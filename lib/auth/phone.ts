/**
 * lib/auth/phone — phone OTP verification orchestration
 * (MIGRATION FOUNDATION, not yet in runtime use).
 * ===========================================================================
 * Replaces the Supabase Auth phone-change OTP used by
 * app/account/verifyPhone/actions.ts. This owns the OTP state machine; actually
 * SENDING the code is a Twilio call the caller makes at wiring time (this
 * returns the code for that purpose). On success it writes the verified flags
 * via markPhoneVerified (replacing the sync_phone_verified trigger).
 */
import { createHash, randomInt } from 'node:crypto'
import {
  upsertPhoneOtp,
  getPhoneOtp,
  incrementPhoneOtpAttempts,
  clearPhoneOtp,
  markPhoneVerified,
} from '@/lib/db/auth'

const OTP_TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

/** 6-digit numeric code, zero-padded, from a CSPRNG. */
export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/** Create/replace the pending OTP for a user; returns the RAW code to send via SMS. */
export async function startPhoneVerification(userId: string, phoneE164: string): Promise<string> {
  const code = generateOtpCode()
  await upsertPhoneOtp({
    userId,
    phoneE164,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  })
  return code
}

export type VerifyOtpResult = 'ok' | 'invalid' | 'expired' | 'too_many_attempts' | 'no_pending'

/** Check a submitted code; on success marks the phone verified and clears the OTP. */
export async function verifyPhoneCode(userId: string, code: string): Promise<VerifyOtpResult> {
  const row = await getPhoneOtp(userId)
  if (!row) return 'no_pending'
  if (row.expiresAt.getTime() < Date.now()) return 'expired'
  if (row.attempts >= MAX_ATTEMPTS) return 'too_many_attempts'
  if (row.codeHash !== hashCode(code)) {
    await incrementPhoneOtpAttempts(userId)
    return 'invalid'
  }
  await markPhoneVerified(userId, row.phoneE164)
  await clearPhoneOtp(userId)
  return 'ok'
}
