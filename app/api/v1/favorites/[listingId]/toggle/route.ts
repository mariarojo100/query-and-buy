/** POST /api/v1/favorites/:listingId/toggle — add/remove a favorite. */
import { getApiViewer } from '@/lib/api/auth'
import { toggleFavoriteFor } from '@/lib/db/favorites'
import { apiRateLimit } from '@/lib/api/rateLimit'
import { ok, fail, unauthorized, handle } from '@/lib/api/respond'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ listingId: string }> },
): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()

    const limited = apiRateLimit(req, viewer, 'toggle-favorite', 60)
    if (limited) return limited

    const { listingId } = await ctx.params
    try {
      const { favorited } = await toggleFavoriteFor(viewer, listingId)
      return ok({ favorited })
    } catch (e) {
      return fail('invalid_input', e instanceof Error ? e.message : 'Could not update favorite.', 422)
    }
  })
}
