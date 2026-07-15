/**
 * POST /api/v1/orders/:id/{confirm|cancel|sold|reactivate} — the order
 * lifecycle. One handler for the four transitions; lib/orders/service.ts owns
 * the state machine + notification fan-out (same path as the web actions).
 */
import { getApiViewer } from '@/lib/api/auth'
import {
  confirmOrderAs,
  cancelOrderAs,
  markOrderSoldAs,
  reactivateListingAs,
  type OrderServiceResult,
} from '@/lib/orders/service'
import { ok, fail, notFound, unauthorized, handle } from '@/lib/api/respond'
import type { Viewer } from '@/lib/authz/viewer'

const TRANSITIONS: Record<string, (viewer: Viewer, orderId: string) => Promise<OrderServiceResult>> = {
  confirm: confirmOrderAs,
  cancel: cancelOrderAs,
  sold: markOrderSoldAs,
  reactivate: reactivateListingAs,
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string; action: string }> },
): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()

    const { id, action } = await ctx.params
    const transition = TRANSITIONS[action]
    if (!transition) return notFound('Action')

    const res = await transition(viewer, id)
    if (!res.ok) return fail('invalid_input', res.error ?? 'Could not update order.', 422)
    return ok({ done: true })
  })
}
