import { logger } from '@/lib/logger'
import { insertModerationLog } from '@/lib/db/system/moderation'

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
    await insertModerationLog(entry)
  } catch {
    /* moderation logging must never block a user action */
  }
}
