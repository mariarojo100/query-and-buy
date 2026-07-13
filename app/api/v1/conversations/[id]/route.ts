/**
 * GET /api/v1/conversations/:id — the full thread view: conversation header,
 * messages (participant-scoped), and the negotiation/order state. The mobile
 * chat screen polls this (5s, focus-gated).
 */
import { getApiViewer } from '@/lib/api/auth'
import { conversationViewFor, conversationMessagesFor } from '@/lib/db/messaging'
import { conversationOrderFor } from '@/lib/db/orders'
import { ok, notFound, unauthorized, handle } from '@/lib/api/respond'

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()
    const { id } = await ctx.params

    const conversation = await conversationViewFor(viewer, id)
    if (!conversation) return notFound('Conversation')

    const [messages, order] = await Promise.all([
      conversationMessagesFor(viewer, id),
      conversationOrderFor(viewer, id),
    ])
    return ok({ conversation, messages, order })
  })
}
