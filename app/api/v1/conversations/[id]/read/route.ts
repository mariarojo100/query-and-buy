/** POST /api/v1/conversations/:id/read — set the viewer's last_read_at. */
import { getApiViewer } from '@/lib/api/auth'
import { markConversationReadFor } from '@/lib/db/messaging'
import { ok, notFound, unauthorized, handle } from '@/lib/api/respond'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()
    const { id } = await ctx.params
    if (!(await markConversationReadFor(viewer, id))) return notFound('Conversation')
    return ok({ read: true })
  })
}
