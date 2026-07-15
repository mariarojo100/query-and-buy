/**
 * POST /api/v1/ai/listing-draft — photos (base64) → AI listing draft with
 * per-field confidence, pricing tiers, and the 70% auto-fill gate.
 * Per-user rate limit (12/min) enforced inside the service.
 */
import { z } from 'zod'
import { getApiViewer } from '@/lib/api/auth'
import { generateListingDraftAs } from '@/lib/ai/listingDraftService'
import { parseBody } from '@/lib/api/validate'
import { ok, fail, unauthorized, handle } from '@/lib/api/respond'

const BodySchema = z.object({
  images: z
    .array(z.object({ mimeType: z.string().min(1), dataBase64: z.string().min(64) }))
    .min(1)
    .max(5),
})

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()

    const parsed = await parseBody(req, BodySchema)
    if (!parsed.ok) return parsed.response

    const res = await generateListingDraftAs(viewer, parsed.data.images)
    if (!res.ok) return fail('invalid_input', res.error, 422)
    return ok({ draft: res.draft })
  })
}
