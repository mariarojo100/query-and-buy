/**
 * GET  /api/v1/conversations — the inbox (block-filtered, unread counts).
 * POST /api/v1/conversations — open (or return) the thread for a listing.
 */
import { CreateConversationSchema } from '@qb/shared'
import { getApiViewer } from '@/lib/api/auth'
import { conversationsFor, createConversationFor, unreadConversationCountFor } from '@/lib/db/messaging'
import { parseBody } from '@/lib/api/validate'
import { apiRateLimit } from '@/lib/api/rateLimit'
import { ok, fail, unauthorized, handle } from '@/lib/api/respond'

export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()
    const [conversations, unreadCount] = await Promise.all([
      conversationsFor(viewer),
      unreadConversationCountFor(viewer),
    ])
    return ok({ conversations, unreadCount })
  })
}

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()

    const limited = apiRateLimit(req, viewer, 'create-conversation', 20)
    if (limited) return limited

    const parsed = await parseBody(req, CreateConversationSchema)
    if (!parsed.ok) return parsed.response

    const res = await createConversationFor(viewer, parsed.data.listingId)
    if (!res.conversationId) return fail('forbidden', res.error ?? 'Could not start conversation.', 403)
    return ok({ conversationId: res.conversationId })
  })
}
