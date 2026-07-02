'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { SITE_URL } from '@/lib/site'
import { logger } from '@/lib/logger'

export type AuthState = { error: string } | null

/**
 * Email/password sign up. The public.users + profiles + user_roles rows are
 * created by the `handle_new_user` DB trigger — not here.
 *
 * With "Confirm email" OFF, signUp returns a session and the user is logged in.
 * With it ON, no session is returned and the user must confirm via /auth/confirm.
 */
export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return { error: error.message }
  }

  // Email confirmation ON → a user is returned but no session yet.
  if (data.user && !data.session) {
    redirect('/login?message=Check your email to confirm your account')
  }

  revalidatePath('/account')
  redirect('/account')
}

/** Email/password login. */
export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Log the real reason; show a generic message so we don't reveal whether an
    // account exists (account-enumeration defence). Keep the "confirm email"
    // hint because it's actionable and not enumeration-sensitive.
    logger.security('auth.login', 'failed login attempt', { reason: error.message })
    const msg = /confirm/i.test(error.message)
      ? 'Please confirm your email before logging in — check your inbox.'
      : 'Invalid email or password.'
    return { error: msg }
  }

  revalidatePath('/account')
  redirect('/account')
}

/** Sign out and return to the login page. */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

/**
 * Step 1 of password reset: email a recovery link. The link lands on
 * /auth/callback (PKCE exchange) which forwards to /reset-password. We ALWAYS
 * report success so an attacker can't probe which emails are registered.
 */
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { error: 'Enter your email address.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
  })
  if (error) logger.security('auth.reset', 'reset request error', { reason: error.message })

  redirect(
    '/login?message=' +
      encodeURIComponent('If an account exists for that email, we’ve sent a reset link.'),
  )
}

/**
 * Step 2 of password reset: the user arrives in a recovery session (via the
 * callback) and sets a new password. Requires an active session.
 */
export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get('password') ?? '')
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Your reset link has expired. Please request a new one.' }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    logger.security('auth.reset', 'password update failed', { reason: error.message })
    return { error: 'Could not update your password. Please try again.' }
  }

  revalidatePath('/', 'layout')
  redirect('/account')
}
