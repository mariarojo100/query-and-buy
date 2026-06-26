'use server'

import { createClient } from '@/utils/supabase/server'
import { REPORT_REASON_VALUES } from '@/lib/reports/reasons'

/**
 * Submit a report against a listing and/or a user. RLS: reporter_id = auth.uid().
 * A listing report sets listing_id (+ the seller as reported_user_id); a user
 * report sets only reported_user_id (listing_id stays null).
 */
export async function submitReport(input: {
  listingId?: string | null
  reportedUserId?: string | null
  reason: string
  description?: string
}): Promise<{ ok?: boolean; needAuth?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { needAuth: true }

  if (!REPORT_REASON_VALUES.includes(input.reason)) return { error: 'Choose a reason.' }
  if (!input.listingId && !input.reportedUserId) return { error: 'Nothing to report.' }
  if (input.reportedUserId && input.reportedUserId === user.id) {
    return { error: "You can't report yourself." }
  }

  const description = input.description?.trim() || null
  if (description && description.length > 1000) {
    return { error: 'Details must be 1000 characters or fewer.' }
  }

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    listing_id: input.listingId ?? null,
    reported_user_id: input.reportedUserId ?? null,
    reason: input.reason,
    description,
  })
  if (error) return { error: error.message }

  return { ok: true }
}
