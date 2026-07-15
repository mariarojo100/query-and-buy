/**
 * POST /api/v1/auth/logout — revoke this device's refresh token.
 * The access token simply expires (≤1h); revocation of the refresh token is
 * what ends the session. Always returns ok (idempotent).
 */
import { RefreshSchema } from '@qb/shared'
import { revokeByRaw } from '@/lib/api/tokens'
import { parseBody } from '@/lib/api/validate'
import { ok, handle } from '@/lib/api/respond'

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const parsed = await parseBody(req, RefreshSchema)
    if (!parsed.ok) return parsed.response

    await revokeByRaw(parsed.data.refreshToken)
    return ok({ loggedOut: true })
  })
}
