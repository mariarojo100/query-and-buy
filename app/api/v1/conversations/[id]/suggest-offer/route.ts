/**
 * POST /api/v1/conversations/:id/suggest-offer — AI pricing guidance
 * (advisory only; heuristic fallback means it always returns a suggestion).
 */
import { getApiViewer } from '@/lib/api/auth'
import { suggestOfferAs } from '@/lib/orders/service'
import { apiRateLimit } from '@/lib/api/rateLimit'
import { ok, fail, unauthorized, handle } from '@/lib/api/respond'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()

    const limited = apiRateLimit(req, viewer, 'suggest-offer', 12)
    if (limited) return limited

    const { id } = await ctx.params
    const res = await suggestOfferAs(viewer, id)
    if (!res.suggestion) return fail('forbidden', res.error ?? 'Not available.', 403)
    return ok({ suggestion: res.suggestion })
  })
}
