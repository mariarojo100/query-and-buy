/** POST /api/v1/offers/:id/respond — accept or decline a pending offer. */
import { RespondToOfferSchema } from '@qb/shared'
import { getApiViewer } from '@/lib/api/auth'
import { respondToOfferAs } from '@/lib/orders/service'
import { parseBody } from '@/lib/api/validate'
import { ok, fail, unauthorized, handle } from '@/lib/api/respond'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()

    const parsed = await parseBody(req, RespondToOfferSchema)
    if (!parsed.ok) return parsed.response

    const { id } = await ctx.params
    const res = await respondToOfferAs(viewer, id, parsed.data.action)
    if (!res.ok) return fail('invalid_input', res.error ?? 'Could not respond to offer.', 422)
    return ok({ [parsed.data.action === 'accept' ? 'accepted' : 'declined']: true })
  })
}
