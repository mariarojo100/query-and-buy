/**
 * lib/auth/tokens — email-verify / password-reset tokens
 * (MIGRATION FOUNDATION, not yet in runtime use).
 * ===========================================================================
 * Replaces Supabase Auth's confirmation/recovery links. A cryptographically
 * random token is returned to the caller (to embed in an email link); only its
 * SHA-256 hash is persisted, so a database leak does not expose usable tokens.
 * Redemption is atomic and single-use (see lib/db/auth#consumeVerificationToken).
 */
import { randomBytes, createHash } from 'node:crypto'
import {
  createVerificationToken,
  consumeVerificationToken,
  consumeEmailVerifyToken,
  type VerificationTokenType,
  type EmailTokenOutcome,
} from '@/lib/db/auth'

const TTL_MS: Record<VerificationTokenType, number> = {
  email_verify: 24 * 60 * 60 * 1000, // 24h
  password_reset: 60 * 60 * 1000, //  1h
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

/** Issue a token of `type` for `userId`; returns the RAW token for the email link. */
export async function issueToken(userId: string, type: VerificationTokenType): Promise<string> {
  const raw = randomBytes(32).toString('base64url')
  await createVerificationToken({
    userId,
    type,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + TTL_MS[type]),
  })
  return raw
}

/** Redeem a raw token; returns the user id on success, or null if invalid/expired/used. */
export async function redeemToken(
  rawToken: string,
  type: VerificationTokenType,
): Promise<{ userId: string } | null> {
  return consumeVerificationToken(hashToken(rawToken), type)
}

/**
 * Redeem an email-verify token with a distinct outcome (ok/expired/invalid/
 * already_verified) so the /verify-email UI can show the right state.
 */
export async function redeemEmailVerifyToken(rawToken: string): Promise<EmailTokenOutcome> {
  return consumeEmailVerifyToken(hashToken(rawToken))
}
