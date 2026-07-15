/** POST /api/v1/uploads/avatar — presigned PUT slot + final public URL. */
import { PresignRequestSchema } from '@qb/shared'
import { getApiViewer } from '@/lib/api/auth'
import { presignAvatarUploadAs } from '@/lib/object-storage/uploads'
import { parseBody } from '@/lib/api/validate'
import { apiRateLimit } from '@/lib/api/rateLimit'
import { ok, fail, unauthorized, handle } from '@/lib/api/respond'

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()

    const limited = apiRateLimit(req, viewer, 'presign-uploads', 20)
    if (limited) return limited

    const parsed = await parseBody(req, PresignRequestSchema)
    if (!parsed.ok) return parsed.response

    const res = await presignAvatarUploadAs(viewer, parsed.data)
    if (!res.slot) return fail('invalid_input', res.error ?? 'Could not presign upload.', 422)
    return ok({ slot: res.slot, publicUrl: res.publicUrl })
  })
}
