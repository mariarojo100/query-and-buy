import { getViewer } from '@/lib/auth/session'
import { notificationsFor, unreadCountFor, type AppNotification } from '@/lib/db/notifications'

export type { AppNotification }

/** Recent notifications for the current user (owner-scoped). */
export async function getNotifications(limit = 20): Promise<AppNotification[]> {
  const viewer = await getViewer()
  if (!viewer) return []
  return notificationsFor(viewer, limit)
}

export async function getUnreadNotificationCount(): Promise<number> {
  const viewer = await getViewer()
  if (!viewer) return 0
  return unreadCountFor(viewer)
}
