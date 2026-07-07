import { getViewer } from '@/lib/auth/session'
import { getPreferencesFor } from '@/lib/db/notifications'

export type NotificationPrefs = {
  offer_emails: boolean
  chat_emails: boolean
  order_emails: boolean
  review_emails: boolean
  marketing_emails: boolean
}

export const DEFAULT_PREFS: NotificationPrefs = {
  offer_emails: true,
  chat_emails: true,
  order_emails: true,
  review_emails: true,
  marketing_emails: false,
}

/** The current user's email preferences (defaults when no row / signed out). */
export async function getMyPreferences(): Promise<NotificationPrefs> {
  const viewer = await getViewer()
  if (!viewer) return DEFAULT_PREFS
  return (await getPreferencesFor(viewer)) ?? DEFAULT_PREFS
}
