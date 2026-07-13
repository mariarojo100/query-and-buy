'use server'

import { getViewer } from '@/lib/auth/session'
import { bumpViewCount, recordListingView } from '@/lib/db/listings'
import { track } from '@/lib/analytics'

/**
 * Record a listing view: bumps view_count and, for signed-in users, upserts a
 * recently-viewed row. Best-effort — never throws, never blocks rendering.
 */
export async function recordView(listingId: string): Promise<{ ok?: boolean }> {
  const viewer = await getViewer()

  try {
    await bumpViewCount(listingId)
  } catch {
    /* view counting is best-effort */
  }
  if (viewer) {
    try {
      await recordListingView(viewer, listingId)
    } catch {
      /* best-effort */
    }
  }
  track('listing_viewed', { listingId })
  return { ok: true }
}
