import { createClient } from '@/utils/supabase/server'

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

const COLUMNS = 'offer_emails, chat_emails, order_emails, review_emails, marketing_emails'

/** The current user's email preferences (defaults when no row exists yet). */
export async function getMyPreferences(): Promise<NotificationPrefs> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return DEFAULT_PREFS
  const { data } = await supabase
    .from('notification_preferences')
    .select(COLUMNS)
    .eq('user_id', user.id)
    .maybeSingle()
  return (data as NotificationPrefs | null) ?? DEFAULT_PREFS
}
