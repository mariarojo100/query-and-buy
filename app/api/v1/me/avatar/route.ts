/**
 * POST /api/v1/me/avatar — persist an uploaded avatar's public URL (the file
 * itself goes to storage via /api/v1/uploads/avatar first).
 */
import { z } from 'zod'
import { getApiViewer } from '@/lib/api/auth'
import { updateAvatarFor } from '@/lib/db/profiles'
import { parseBody } from '@/lib/api/validate'
import { ok, unauthorized, handle } from '@/lib/api/respond'

// Only accept URLs on our own avatars bucket (the presign flow returns these) —
// don't let a client point their public avatar at an arbitrary external URL.
const BodySchema = z.object({
  avatarUrl: z
    .string()
    .url()
    .max(500)
    .refine((u) => u.startsWith('https://avatars.queryandbuy.com/'), 'Invalid avatar URL.'),
})

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()
    const parsed = await parseBody(req, BodySchema)
    if (!parsed.ok) return parsed.response
    await updateAvatarFor(viewer, parsed.data.avatarUrl)
    return ok({ updated: true })
  })
}
