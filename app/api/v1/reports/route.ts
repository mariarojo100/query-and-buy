/** POST /api/v1/reports — report a listing and/or user (App Store UGC). */
import { z } from 'zod'
import { getApiViewer } from '@/lib/api/auth'
import { submitReportFor } from '@/lib/db/reports'
import { REPORT_REASON_VALUES } from '@/lib/reports/reasons'
import { parseBody } from '@/lib/api/validate'
import { apiRateLimit } from '@/lib/api/rateLimit'
import { ok, fail, unauthorized, handle } from '@/lib/api/respond'

const BodySchema = z.object({
  listingId: z.string().uuid().nullish(),
  reportedUserId: z.string().uuid().nullish(),
  reason: z.string().min(1),
  description: z.string().trim().max(1000, 'Details must be 1000 characters or fewer.').optional(),
})

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()

    const limited = apiRateLimit(req, viewer, 'submit-report', 10)
    if (limited) return limited

    const parsed = await parseBody(req, BodySchema)
    if (!parsed.ok) return parsed.response
    const input = parsed.data

    if (!REPORT_REASON_VALUES.includes(input.reason)) return fail('invalid_input', 'Choose a reason.', 422)
    if (!input.listingId && !input.reportedUserId) return fail('invalid_input', 'Nothing to report.', 422)
    if (input.reportedUserId && input.reportedUserId === viewer.id) {
      return fail('invalid_input', "You can't report yourself.", 422)
    }

    await submitReportFor(viewer, {
      listingId: input.listingId ?? null,
      reportedUserId: input.reportedUserId ?? null,
      reason: input.reason,
      description: input.description?.trim() || null,
    })
    return ok({ reported: true })
  })
}
