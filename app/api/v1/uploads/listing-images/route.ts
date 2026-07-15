/**
 * POST /api/v1/uploads/listing-images — presigned PUT slots for listing
 * photos. The device uploads directly to storage with the returned slots.
 */
import { z } from 'zod'
import { PresignRequestSchema } from '@qb/shared'
import { getApiViewer } from '@/lib/api/auth'
import { presignListingUploadsAs } from '@/lib/object-storage/uploads'
import { parseBody } from '@/lib/api/validate'
import { apiRateLimit } from '@/lib/api/rateLimit'
import { ok, fail, unauthorized, handle } from '@/lib/api/respond'

const BodySchema = z.object({ files: z.array(PresignRequestSchema).min(1).max(8) })

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()

    const limited = apiRateLimit(req, viewer, 'presign-uploads', 20)
    if (limited) return limited

    const parsed = await parseBody(req, BodySchema)
    if (!parsed.ok) return parsed.response

    const res = await presignListingUploadsAs(viewer, parsed.data.files)
    if (!res.slots) return fail('invalid_input', res.error ?? 'Could not presign uploads.', 422)
    return ok({ slots: res.slots })
  })
}
