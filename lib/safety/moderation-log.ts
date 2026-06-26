import { createServiceClient } from '@/utils/supabase/admin'
import { logger } from '@/lib/logger'

/**
 * Record an automated moderation decision to ai_moderation_log (admin portal).
 * Best-effort and self-contained — never throws, so it can never break the
 * upload / listing flow it observes.
 */
export async function logModeration(entry: {
  listingId?: string | null
  source: 'listing' | 'upload' | 'message'
  decision: 'allowed' | 'blocked' | 'flagged'
  confidence?: number | null
  reason?: string | null
}): Promise<void> {
  logger.info('moderation', `ai decision: ${entry.decision}`, {
    source: entry.source,
    confidence: entry.confidence ?? null,
  })
  try {
    const admin = createServiceClient()
    await admin.from('ai_moderation_log').insert({
      listing_id: entry.listingId ?? null,
      source: entry.source,
      decision: entry.decision,
      confidence: entry.confidence ?? null,
      reason: entry.reason ?? null,
    })
  } catch {
    /* moderation logging must never block a user action */
  }
}
