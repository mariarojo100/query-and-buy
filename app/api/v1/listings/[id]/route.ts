/**
 * GET /api/v1/listings/:id — listing detail. Public (anon sees active
 * listings only; owner/staff/order-participants see more — the same
 * listingByIdVisible policy as the web page). Bundles similar listings and,
 * for signed-in viewers, whether it's favorited.
 */
import { getApiViewer } from '@/lib/api/auth'
import { listingByIdVisible, similarListings } from '@/lib/db/listings'
import { favoritedIdsFor } from '@/lib/db/favorites'
import { ok, notFound, handle } from '@/lib/api/respond'

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(async () => {
    const { id } = await ctx.params
    const viewer = await getApiViewer(req)

    const listing = await listingByIdVisible(viewer, id)
    if (!listing) return notFound('Listing')

    const [similar, favoritedSet] = await Promise.all([
      similarListings(id, 8),
      viewer ? favoritedIdsFor(viewer, [id]) : Promise.resolve(new Set<string>()),
    ])

    return ok({ listing, similar, isFavorited: favoritedSet.has(id) })
  })
}
