/** POST /api/v1/notifications/read-all — mark all notifications read. */
import { getApiViewer } from '@/lib/api/auth'
import { markAllReadFor } from '@/lib/db/notifications'
import { ok, unauthorized, handle } from '@/lib/api/respond'

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()
    await markAllReadFor(viewer)
    return ok({ read: true })
  })
}
