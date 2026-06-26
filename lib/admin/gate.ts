import { forbidden, redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'

/**
 * Env allowlist admin (no DB needed). Kept as a fallback alongside the
 * user_roles 'admin'/'super_admin' role.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const allow = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return allow.includes(email.toLowerCase())
}

/** Resolve the current user and whether they are an admin (DB role or env). */
export async function getIsAdmin(): Promise<{ user: User | null; isAdmin: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { user: null, isAdmin: false }
  if (isAdminEmail(user.email)) return { user, isAdmin: true }

  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .in('role', ['admin', 'super_admin'])
    .maybeSingle()
  return { user, isAdmin: !!data }
}

/**
 * Guard for admin routes. Unauthenticated → /login; authenticated non-admins →
 * a real 403 via forbidden(). Returns the admin user on success.
 */
export async function requireAdmin(): Promise<User> {
  const { user, isAdmin } = await getIsAdmin()
  if (!user) redirect('/login?redirectTo=/admin')
  if (!isAdmin) forbidden()
  return user
}
