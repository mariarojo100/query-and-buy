/**
 * lib/db/reports — report insert (Phase 4). Replaces the reports_insert RLS
 * (reporter_id = auth.uid()): reporterId is pinned to the viewer here, so a
 * reporter can never be forged as someone else.
 */
import { db } from '@/lib/db'
import type { Viewer } from '@/lib/authz/viewer'

export async function submitReportFor(
  viewer: Viewer,
  input: { listingId: string | null; reportedUserId: string | null; reason: string; description: string | null },
): Promise<void> {
  await db.report.create({
    data: {
      reporterId: viewer.id,
      listingId: input.listingId,
      reportedUserId: input.reportedUserId,
      reason: input.reason,
      description: input.description,
    },
  })
}
