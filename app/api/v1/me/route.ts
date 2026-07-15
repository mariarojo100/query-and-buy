/**
 * GET /api/v1/me — the signed-in user's own card + profile (app start,
 * account tab). 401 when the bearer token is missing/expired.
 */
import { getApiViewer } from '@/lib/api/auth'
import { profileById } from '@/lib/db/profiles'
import { ok, unauthorized, handle } from '@/lib/api/respond'

export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()

    const profile = await profileById(viewer.id)
    return ok({
      id: viewer.id,
      email: viewer.email,
      isAdmin: viewer.isAdmin,
      profile,
    })
  })
}
