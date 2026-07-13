/** GET /api/v1/my/listings — the seller's own listings (all statuses). */
import { getApiViewer } from '@/lib/api/auth'
import { myListings } from '@/lib/db/listings'
import { ok, unauthorized, handle } from '@/lib/api/respond'

export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()
    return ok({ listings: await myListings(viewer) })
  })
}
