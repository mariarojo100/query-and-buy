/**
 * lib/db/system/moderation — ai_moderation_log writes (Phase 4).
 * Deny-all table under RLS (service-role only); a system repo here.
 */
import { db } from '@/lib/db'

export async function insertModerationLog(entry: {
  listingId?: string | null
  source: string
  decision: string
  confidence?: number | null
  reason?: string | null
}): Promise<void> {
  await db.aiModerationLog.create({
    data: {
      listingId: entry.listingId ?? null,
      source: entry.source,
      decision: entry.decision,
      confidence: entry.confidence ?? null,
      reason: entry.reason ?? null,
    },
  })
}
