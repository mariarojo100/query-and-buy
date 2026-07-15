/**
 * POST /api/v1/me/delete — delete the signed-in user's account (App Store /
 * Play Store requirement). Soft-delete + anonymize + revoke every session in
 * one transaction (lib/db/profiles.ts#deleteAccountFor). Irreversible.
 */
import { getApiViewer } from '@/lib/api/auth'
import { deleteAccountFor } from '@/lib/db/profiles'
import { apiRateLimit } from '@/lib/api/rateLimit'
import { ok, unauthorized, handle } from '@/lib/api/respond'

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()

    const limited = apiRateLimit(req, viewer, 'delete-account', 3, 60_000)
    if (limited) return limited

    await deleteAccountFor(viewer)
    return ok({ deleted: true })
  })
}
