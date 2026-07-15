/**
 * POST /api/v1/conversations/:id/offers — make/counter an offer.
 * lib/orders/service.ts owns validation, the state machine call, and the
 * notification fan-out (same path as the web action).
 */
import { MakeOfferSchema } from '@qb/shared'
import { getApiViewer } from '@/lib/api/auth'
import { makeOfferAs } from '@/lib/orders/service'
import { parseBody } from '@/lib/api/validate'
import { apiRateLimit } from '@/lib/api/rateLimit'
import { ok, fail, unauthorized, handle } from '@/lib/api/respond'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()

    const limited = apiRateLimit(req, viewer, 'make-offer', 15)
    if (limited) return limited

    const parsed = await parseBody(req, MakeOfferSchema)
    if (!parsed.ok) return parsed.response

    const { id } = await ctx.params
    const res = await makeOfferAs(viewer, id, parsed.data.amountAed)
    if (!res.ok) return fail('invalid_input', res.error ?? 'Could not make offer.', 422)
    return ok({ sent: true })
  })
}
