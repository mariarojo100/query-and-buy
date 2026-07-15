/** PATCH /api/v1/me/profile — update the signed-in user's profile. */
import { UpdateProfileSchema } from '@qb/shared'
import { getApiViewer } from '@/lib/api/auth'
import { updateProfileFor } from '@/lib/db/profiles'
import { parseBody } from '@/lib/api/validate'
import { ok, fail, unauthorized, handle } from '@/lib/api/respond'

export async function PATCH(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()

    const parsed = await parseBody(req, UpdateProfileSchema)
    if (!parsed.ok) return parsed.response

    const res = await updateProfileFor(viewer, {
      displayName: parsed.data.displayName,
      username: parsed.data.username,
      bio: parsed.data.bio || null,
      emirate: parsed.data.emirate || null,
    })
    if (!res.ok) return fail('conflict', 'That username is already taken.', 409)
    return ok({ updated: true })
  })
}
