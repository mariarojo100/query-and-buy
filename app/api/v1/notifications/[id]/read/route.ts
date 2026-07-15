/** POST /api/v1/notifications/:id/read — mark one notification read. */
import { getApiViewer } from '@/lib/api/auth'
import { markNotificationReadFor } from '@/lib/db/notifications'
import { ok, unauthorized, handle } from '@/lib/api/respond'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()
    const { id } = await ctx.params
    await markNotificationReadFor(viewer, id)
    return ok({ read: true })
  })
}
