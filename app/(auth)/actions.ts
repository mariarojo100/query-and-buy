'use server'

import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'
import { signIn, signOut as authSignOut } from '@/lib/auth/nextauth'
import { registerWithPassword, beginPasswordReset, completePasswordReset, SignupError } from '@/lib/auth/signup'
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/email/auth-emails'
import { getViewer } from '@/lib/auth/session'
import { issueToken } from '@/lib/auth/tokens'
import { getCredentialByEmail } from '@/lib/db/auth'
import { verifyPassword } from '@/lib/auth/password'
import { logger } from '@/lib/logger'

const CHECK_INBOX_MESSAGE =
  'Account created. We’ve emailed you a confirmation link — confirm your email, then sign in.'

export type AuthState = { error: string } | null

/**
 * Email/password sign up. Creates the account bundle (lib/auth/signup →
 * lib/db/auth, replacing the handle_new_user trigger) and emails a verification
 * link. The account is NOT signed in — it is gated until the user confirms their
 * email (login rejects unverified accounts), so we redirect to the login page
 * with a "check your inbox" message instead of creating a session.
 */
export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  if (!email || !password) return { error: 'Email and password are required.' }

  try {
    const { emailVerifyToken } = await registerWithPassword({ email, password })
    await sendVerificationEmail(email.toLowerCase(), emailVerifyToken)
  } catch (e) {
    if (e instanceof SignupError) return { error: e.message }
    throw e
  }

  redirect('/login?message=' + encodeURIComponent(CHECK_INBOX_MESSAGE))
}

/** Email/password login via Auth.js Credentials. */
export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  if (!email || !password) return { error: 'Email and password are required.' }

  // If the credentials are correct but the email isn't confirmed yet, guide the
  // user to their inbox and re-send the link — rather than a generic failure.
  // Password is verified first, so this leaks no account-existence info.
  const cred = await getCredentialByEmail(email.toLowerCase())
  if (cred && !cred.emailVerified && (await verifyPassword(password, cred.passwordHash))) {
    try {
      const token = await issueToken(cred.userId, 'email_verify')
      await sendVerificationEmail(email.toLowerCase(), token)
    } catch {
      /* non-blocking — the user can still request another link */
    }
    return {
      error: 'Please confirm your email to continue — we’ve sent a fresh link to your inbox.',
    }
  }

  try {
    await signIn('credentials', { email, password, redirectTo: '/account' })
  } catch (e) {
    if (e instanceof AuthError) {
      // Generic message so we don't reveal whether an account exists.
      logger.security('auth.login', 'failed login attempt', { reason: e.type })
      return { error: 'Invalid email or password.' }
    }
    throw e // NEXT_REDIRECT
  }
  return null
}

/** Sign out and return to the login page. */
export async function signOut(): Promise<void> {
  await authSignOut({ redirectTo: '/login' })
}

/**
 * Resend the email-verification link to the signed-in user. Lets a user who
 * never received (or lost) the signup email re-trigger it themselves. Issues a
 * fresh 24h token; redeeming it marks the email verified idempotently.
 */
export async function resendVerificationEmail(): Promise<{ ok: boolean; error?: string }> {
  const viewer = await getViewer()
  if (!viewer?.email) return { ok: false, error: 'You must be signed in.' }
  try {
    const token = await issueToken(viewer.id, 'email_verify')
    await sendVerificationEmail(viewer.email.toLowerCase(), token)
    return { ok: true }
  } catch (e) {
    logger.security('auth.resend', 'resend verification failed', {
      reason: e instanceof Error ? e.message : 'unknown',
    })
    return { ok: false, error: 'Could not send right now. Please try again shortly.' }
  }
}

/**
 * Step 1 of password reset: email a reset link. We ALWAYS report success so an
 * attacker can't probe which emails are registered.
 */
export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { error: 'Enter your email address.' }

  try {
    const token = await beginPasswordReset(email)
    if (token) await sendPasswordResetEmail(email.toLowerCase(), token)
  } catch (e) {
    logger.security('auth.reset', 'reset request error', { reason: e instanceof Error ? e.message : 'unknown' })
  }

  redirect(
    '/login?message=' + encodeURIComponent('If an account exists for that email, we’ve sent a reset link.'),
  )
}

/** Step 2 of password reset: set a new password using the emailed token. */
export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get('password') ?? '')
  const token = String(formData.get('token') ?? '')
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }
  if (!token) return { error: 'Your reset link is invalid. Please request a new one.' }

  let ok = false
  try {
    ok = await completePasswordReset(token, password)
  } catch (e) {
    if (e instanceof SignupError) return { error: e.message }
    throw e
  }
  if (!ok) return { error: 'Your reset link has expired. Please request a new one.' }

  redirect('/login?message=' + encodeURIComponent('Password updated — please log in.'))
}
