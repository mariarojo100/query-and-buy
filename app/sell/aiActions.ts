'use server'

import { getViewer } from '@/lib/auth/session'
import {
  generateListingDraftAs,
  type AiDraft,
  type AiDraftResult,
  type AiPricing,
} from '@/lib/ai/listingDraftService'
import type { AiImageInput } from '@/lib/ai/provider'

/**
 * Photo → listing draft — thin wrapper over lib/ai/listingDraftService.ts
 * (shared with the mobile API): rate limiting, the 70% confidence gate, the
 * transparency panel, pricing tiers, and moderation logging live there.
 */

export type { AiDraft, AiDraftResult, AiPricing }

/** Generate an editable listing draft from photos. Never throws — returns {ok:false}. */
export async function generateListingDraft(images: AiImageInput[]): Promise<AiDraftResult> {
  const viewer = await getViewer()
  if (!viewer) return { ok: false, error: 'You must be signed in.' }
  return generateListingDraftAs(viewer, images)
}
