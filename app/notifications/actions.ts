'use server'

import { revalidatePath } from 'next/cache'
import { getViewer } from '@/lib/auth/session'
import { markNotificationReadFor, markAllReadFor, upsertPreferencesFor } from '@/lib/db/notifications'
import { DEFAULT_PREFS, type NotificationPrefs } from '@/lib/notifications/preferences'

/** Mark one notification read (owner-scoped). */
export async function markNotificationRead(id: string): Promise<{ ok?: boolean }> {
  const viewer = await getViewer()
  if (!viewer) return {}
  await markNotificationReadFor(viewer, id)
  revalidatePath('/notifications')
  return { ok: true }
}

/** Mark all of the current user's notifications read. */
export async function markAllNotificationsRead(): Promise<{ ok?: boolean }> {
  const viewer = await getViewer()
  if (!viewer) return {}
  await markAllReadFor(viewer)
  revalidatePath('/notifications')
  return { ok: true }
}

/** Save the current user's email notification preferences (upsert). */
export async function updateNotificationPreferences(
  prefs: NotificationPrefs,
): Promise<{ ok?: boolean; error?: string }> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }

  // Whitelist + coerce to booleans so only known keys are written.
  const clean: NotificationPrefs = {
    offer_emails: !!(prefs.offer_emails ?? DEFAULT_PREFS.offer_emails),
    chat_emails: !!(prefs.chat_emails ?? DEFAULT_PREFS.chat_emails),
    order_emails: !!(prefs.order_emails ?? DEFAULT_PREFS.order_emails),
    review_emails: !!(prefs.review_emails ?? DEFAULT_PREFS.review_emails),
    marketing_emails: !!(prefs.marketing_emails ?? DEFAULT_PREFS.marketing_emails),
  }
  try {
    await upsertPreferencesFor(viewer, clean)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not save preferences.' }
  }
  revalidatePath('/account')
  return { ok: true }
}
