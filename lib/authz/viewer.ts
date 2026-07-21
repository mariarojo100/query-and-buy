/**
 * lib/authz/viewer — the identity of "who is asking", for application-level
 * authorization (MIGRATION FOUNDATION, not yet in runtime use).
 * ===========================================================================
 * Under Supabase, authorization lives in Postgres RLS keyed on auth.uid() plus
 * the SECURITY DEFINER helpers is_staff() / is_admin(). After the migration the
 * database has no RLS, so every query must be scoped in application code to a
 * `Viewer`. This module is the PURE core of that: types + derivation only, no
 * database and no session library, so it can be imported anywhere and unit
 * tested trivially. The DB-backed loader lives in lib/db/viewer.ts; the session
 * source (Auth.js) is built in Phase 3.
 *
 * Semantics are a faithful port of the current authorization surface:
 *   - is_admin() (SQL) + lib/admin/gate.ts: role in {admin, super_admin} OR the
 *     ADMIN_EMAILS env allowlist (case-insensitive).
 *   - is_staff() (SQL): role in {moderator, admin, super_admin}.
 * lib/admin/gate.ts is intentionally left untouched; this is the target-stack
 * equivalent that will replace it in Phase 4.
 */
import type { AppRole } from '@/lib/generated/prisma/enums'

export const ADMIN_ROLES: readonly AppRole[] = ['admin', 'super_admin']
export const STAFF_ROLES: readonly AppRole[] = ['moderator', 'admin', 'super_admin']

/** The authenticated (or anonymous) actor a query is scoped to. */
export interface Viewer {
  /** users.id / profiles.id (they are equal by construction). */
  readonly id: string
  readonly email: string | null
  readonly roles: readonly AppRole[]
  /** users.has_email_verified — the account confirmed its email. Gates transacting. */
  readonly emailVerified: boolean
  /** role ∈ STAFF_ROLES — mirrors the SQL is_staff() helper. */
  readonly isStaff: boolean
  /** role ∈ ADMIN_ROLES, or email ∈ ADMIN_EMAILS — mirrors is_admin() + the env gate. */
  readonly isAdmin: boolean
}

/** Env allowlist admin, identical rule to lib/admin/gate.ts#isAdminEmail. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const allow = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return allow.includes(email.toLowerCase())
}

export interface ViewerInput {
  id: string
  email: string | null
  roles: readonly AppRole[]
  emailVerified: boolean
}

/**
 * Build a Viewer from already-fetched identity data (session id/email + the
 * user_roles rows). Pure — no I/O. The single place isStaff/isAdmin are decided.
 */
export function deriveViewer({ id, email, roles, emailVerified }: ViewerInput): Viewer {
  const isStaff = roles.some((r) => STAFF_ROLES.includes(r))
  const isAdmin = roles.some((r) => ADMIN_ROLES.includes(r)) || isAdminEmail(email)
  return { id, email, roles, emailVerified, isStaff, isAdmin }
}
