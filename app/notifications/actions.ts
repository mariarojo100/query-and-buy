'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { DEFAULT_PREFS, type NotificationPrefs } from '@/lib/notifications/preferences'

/** Mark one notification read (RLS scopes to owner). */
export async function markNotificationRead(id: string): Promise<{ ok?: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return {}
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null)
  revalidatePath('/notifications')
  return { ok: true }
}

/** Mark all of the current user's notifications read. */
export async function markAllNotificationsRead(): Promise<{ ok?: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return {}
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)
  revalidatePath('/notifications')
  return { ok: true }
}

/** Save the current user's email notification preferences (upsert). */
export async function updateNotificationPreferences(
  prefs: NotificationPrefs,
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  // Whitelist + coerce to booleans so only known keys are written.
  const row = {
    user_id: user.id,
    offer_emails: !!(prefs.offer_emails ?? DEFAULT_PREFS.offer_emails),
    chat_emails: !!(prefs.chat_emails ?? DEFAULT_PREFS.chat_emails),
    order_emails: !!(prefs.order_emails ?? DEFAULT_PREFS.order_emails),
    review_emails: !!(prefs.review_emails ?? DEFAULT_PREFS.review_emails),
    marketing_emails: !!(prefs.marketing_emails ?? DEFAULT_PREFS.marketing_emails),
  }
  const { error } = await supabase
    .from('notification_preferences')
    .upsert(row, { onConflict: 'user_id' })
  if (error) return { error: error.message }
  revalidatePath('/account')
  return { ok: true }
}
