import { forbidden, redirect } from 'next/navigation'
import { getViewer } from '@/lib/auth/session'
import type { Viewer } from '@/lib/authz/viewer'

// Env-allowlist admin check, re-exported from the authz layer (unchanged rule).
export { isAdminEmail } from '@/lib/authz/viewer'

/** Resolve the current viewer and whether they are an admin (DB role or env). */
export async function getIsAdmin(): Promise<{ user: Viewer | null; isAdmin: boolean }> {
  const user = await getViewer()
  return { user, isAdmin: user?.isAdmin ?? false }
}

/**
 * Guard for admin routes. Unauthenticated → /login; authenticated non-admins →
 * a real 403 via forbidden(). Returns the admin viewer on success.
 */
export async function requireAdmin(): Promise<Viewer> {
  const user = await getViewer()
  if (!user) redirect('/login?redirectTo=/admin')
  if (!user.isAdmin) forbidden()
  return user
}
