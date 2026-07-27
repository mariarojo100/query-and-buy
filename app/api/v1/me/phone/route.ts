/**
 * GET /api/v1/me/phone — the signed-in user's phone-verification state.
 * Mobile counterpart of app/account/verifyPhone/actions.ts#getPhoneState.
 */
import { getApiViewer } from '@/lib/api/auth'
import { getVerificationState } from '@/lib/db/auth'
import { ok, unauthorized, handle } from '@/lib/api/respond'

export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    if (!viewer) return unauthorized()

    const state = await getVerificationState(viewer.id)
    return ok({
      phoneE164: state?.phoneE164 ?? null,
      verified: state?.phoneVerified ?? false,
    })
  })
}
