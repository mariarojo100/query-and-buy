'use server'

import { getViewer } from '@/lib/auth/session'
import { submitReportFor } from '@/lib/db/reports'
import { REPORT_REASON_VALUES } from '@/lib/reports/reasons'

/**
 * Submit a report against a listing and/or a user. reporter_id is pinned to the
 * viewer in the repository (was RLS reporter_id = auth.uid()).
 */
export async function submitReport(input: {
  listingId?: string | null
  reportedUserId?: string | null
  reason: string
  description?: string
}): Promise<{ ok?: boolean; needAuth?: boolean; error?: string }> {
  const viewer = await getViewer()
  if (!viewer) return { needAuth: true }

  if (!REPORT_REASON_VALUES.includes(input.reason)) return { error: 'Choose a reason.' }
  if (!input.listingId && !input.reportedUserId) return { error: 'Nothing to report.' }
  if (input.reportedUserId && input.reportedUserId === viewer.id) {
    return { error: "You can't report yourself." }
  }

  const description = input.description?.trim() || null
  if (description && description.length > 1000) {
    return { error: 'Details must be 1000 characters or fewer.' }
  }

  try {
    await submitReportFor(viewer, {
      listingId: input.listingId ?? null,
      reportedUserId: input.reportedUserId ?? null,
      reason: input.reason,
      description,
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not submit report.' }
  }
  return { ok: true }
}
