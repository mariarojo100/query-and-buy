/**
 * lib/auth/signup — email/password registration + password reset orchestration
 * (MIGRATION FOUNDATION, not yet in runtime use).
 * ===========================================================================
 * The app-level replacement for Supabase's auth.signUp + the handle_new_user
 * trigger. Unlike the trigger (which swallowed all exceptions after a past
 * OAuth outage), this path is a single transaction that FAILS LOUDLY. Sending
 * the verification/reset email is the caller's job (lib/email, at wiring time);
 * these functions just produce the token.
 */
import {
  createUserAccount,
  getUserIdByEmail,
  getCredentialByEmail,
  upsertPasswordHash,
} from '@/lib/db/auth'
import { hashPassword } from '@/lib/auth/password'
import { issueToken, redeemToken } from '@/lib/auth/tokens'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 8 // Supabase local config allowed 6; the target tightens to 8.

export class SignupError extends Error {}

export interface RegisterInput {
  email: string
  password: string
  /** Optional — the signup form collects only email/password; defaults to the email local part. */
  displayName?: string
}

/** Register a new email/password user. Returns the id + a raw email-verify token. */
export async function registerWithPassword(
  input: RegisterInput,
): Promise<{ userId: string; emailVerifyToken: string }> {
  const email = input.email.trim().toLowerCase()
  if (!EMAIL_RE.test(email)) throw new SignupError('Enter a valid email address.')
  if (input.password.length < MIN_PASSWORD) throw new SignupError(`Password must be at least ${MIN_PASSWORD} characters.`)
  const displayName = (input.displayName ?? '').trim() || email.split('@')[0]

  if (await getUserIdByEmail(email)) throw new SignupError('An account with this email already exists.')

  const passwordHash = await hashPassword(input.password)
  const { id } = await createUserAccount({ email, displayName, passwordHash })
  const emailVerifyToken = await issueToken(id, 'email_verify')
  return { userId: id, emailVerifyToken }
}

/** Begin password reset: returns a raw reset token, or null if no such account (do not leak existence). */
export async function beginPasswordReset(rawEmail: string): Promise<string | null> {
  const email = rawEmail.trim().toLowerCase()
  const userId = await getUserIdByEmail(email)
  if (!userId) return null
  // Only accounts that already have (or can have) a password use this flow.
  await getCredentialByEmail(email) // presence not required — OAuth users may set a first password
  return issueToken(userId, 'password_reset')
}

/** Complete password reset with a raw token; returns true on success. */
export async function completePasswordReset(rawToken: string, newPassword: string): Promise<boolean> {
  if (newPassword.length < MIN_PASSWORD) throw new SignupError(`Password must be at least ${MIN_PASSWORD} characters.`)
  const redeemed = await redeemToken(rawToken, 'password_reset')
  if (!redeemed) return false
  await upsertPasswordHash(redeemed.userId, await hashPassword(newPassword))
  return true
}
