'use server'

import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'
import { track } from '@/lib/analytics'

/**
 * Record a listing view: bumps view_count (service client — listing RLS is
 * owner-only for updates) and, for signed-in users, upserts a recently-viewed
 * row. Best-effort — never throws, never blocks rendering.
 */
export async function recordView(listingId: string): Promise<{ ok?: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  try {
    const admin = createServiceClient()
    const { data: cur } = await admin
      .from('listings')
      .select('view_count')
      .eq('id', listingId)
      .maybeSingle()
    if (cur) {
      await admin
        .from('listings')
        .update({ view_count: ((cur as { view_count: number }).view_count ?? 0) + 1 })
        .eq('id', listingId)
    }
  } catch {
    /* view counting is best-effort */
  }

  if (user) {
    await supabase
      .from('listing_views')
      .upsert(
        { user_id: user.id, listing_id: listingId, viewed_at: new Date().toISOString() },
        { onConflict: 'user_id,listing_id' },
      )
  }
  track('listing_viewed', { listingId })
  return { ok: true }
}
