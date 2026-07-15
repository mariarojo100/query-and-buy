/** GET /api/v1/notifications — in-app notifications + unread count (30s poll). */
import { getApiViewer } from '@/lib/api/auth'
import { notificationsFor, unreadCountFor } from '@/lib/db/notifications'
import { ok, unauthorized, handle } from '@/lib/api/respond'

export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()
    const [notifications, unreadCount] = await Promise.all([
      notificationsFor(viewer, 30),
      unreadCountFor(viewer),
    ])
    return ok({ notifications, unreadCount })
  })
}
