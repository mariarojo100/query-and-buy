'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

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
    return { error: error.message }
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
