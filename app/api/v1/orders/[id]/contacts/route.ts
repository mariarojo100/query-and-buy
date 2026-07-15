/**
 * GET /api/v1/orders/:id/contacts — both parties' contact details.
 * Only returned after BOTH sides confirmed (enforced in the repository).
 */
import { getApiViewer } from '@/lib/api/auth'
import { revealedContactsFor } from '@/lib/db/orders'
import { ok, fail, unauthorized, handle } from '@/lib/api/respond'

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()
    const { id } = await ctx.params
    const res = await revealedContactsFor(viewer, id)
    if (res.error || !res.buyer || !res.seller) {
      return fail('forbidden', res.error ?? 'Contacts are not unlocked yet.', 403)
    }
    return ok({ buyer: res.buyer, seller: res.seller })
  })
}
