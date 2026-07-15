/**
 * lib/api/auth — bearer-token authentication for /api/v1 route handlers.
 * ===========================================================================
 * The mobile counterpart of lib/auth/session.ts#getViewer(): parses
 * `Authorization: Bearer <access JWT>`, verifies it (lib/api/tokens.ts), and
 * loads the Viewer (roles from DB) that every repository call is scoped to.
 * No cookies, no React cache — route handlers pass the Request explicitly.
 */
import { verifyAccessToken } from '@/lib/api/tokens'
import { loadViewerIfActive } from '@/lib/db/viewer'
import type { Viewer } from '@/lib/authz/viewer'

/**
 * Viewer for the request's bearer token, or null (missing/invalid/expired
 * token, or deleted/banned account).
 */
export async function getApiViewer(req: Request): Promise<Viewer | null> {
  const header = req.headers.get('authorization') ?? ''
  if (!header.toLowerCase().startsWith('bearer ')) return null
  const token = header.slice(7).trim()
  if (!token) return null

  const userId = await verifyAccessToken(token)
  if (!userId) return null

  return loadViewerIfActive(userId)
}
