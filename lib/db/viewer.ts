/**
 * lib/db/viewer — load a Viewer from the database (MIGRATION FOUNDATION,
 * not yet in runtime use).
 * ===========================================================================
 * The seam between Phase 3 (Auth.js gives us an authenticated user id + email)
 * and the authorization layer: given identity, fetch the user's roles and build
 * the Viewer. Lives under lib/db/** because it touches the raw client; feature
 * code calls this (in Phase 4), never `db` directly.
 */
import { db } from '@/lib/db'
import { deriveViewer, type Viewer } from '@/lib/authz/viewer'

/**
 * Build the Viewer for an authenticated user. `id` and `email` come from the
 * Auth.js session (Phase 3); roles come from user_roles.
 */
export async function loadViewer(id: string, email: string | null): Promise<Viewer> {
  const rows = await db.userRole.findMany({
    where: { userId: id },
    select: { role: true },
  })
  return deriveViewer({ id, email, roles: rows.map((r) => r.role) })
}
