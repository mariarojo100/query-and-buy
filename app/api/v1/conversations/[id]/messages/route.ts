/**
 * POST /api/v1/conversations/:id/messages — send a message.
 * lib/messaging/service.ts handles validation, contact protection, and the
 * recipient's notification (same path as the web action).
 */
import { SendMessageSchema } from '@qb/shared'
import { getApiViewer } from '@/lib/api/auth'
import { sendMessageAs } from '@/lib/messaging/service'
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

    const limited = apiRateLimit(req, viewer, 'send-message', 30)
    if (limited) return limited

    const parsed = await parseBody(req, SendMessageSchema)
    if (!parsed.ok) return parsed.response

    const { id } = await ctx.params
    const res = await sendMessageAs(viewer, id, parsed.data.body)
    if (!res.ok) {
      return res.blocked ? fail('blocked_content', res.error, 422) : fail('forbidden', res.error, 403)
    }
    return ok({ sent: true })
  })
}
