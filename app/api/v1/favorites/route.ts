/** GET /api/v1/favorites — the viewer's favorited listings feed. */
import { getApiViewer } from '@/lib/api/auth'
import { favoritesFeedFor } from '@/lib/db/favorites'
import { ok, unauthorized, handle } from '@/lib/api/respond'

export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()
    return ok({ listings: await favoritesFeedFor(viewer) })
  })
}
