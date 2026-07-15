/**
 * POST /api/v1/auth/refresh — rotate a refresh token for a new pair.
 * Presenting an already-rotated token is treated as theft: every live token
 * for that user is revoked and the client must re-authenticate.
 */
import { RefreshSchema } from '@qb/shared'
import { rotateRefreshToken } from '@/lib/api/tokens'
import { establishUserCard } from '@/lib/api/session'
import { parseBody } from '@/lib/api/validate'
import { apiRateLimit } from '@/lib/api/rateLimit'
import { ok, fail, handle } from '@/lib/api/respond'

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const limited = apiRateLimit(req, null, 'auth-refresh', 20, 60_000)
    if (limited) return limited

    const parsed = await parseBody(req, RefreshSchema)
    if (!parsed.ok) return parsed.response

    const result = await rotateRefreshToken(parsed.data.refreshToken)
    if (!result.ok) {
      const message =
        result.reason === 'reused'
          ? 'Session security reset — sign in again.'
          : 'Session expired — sign in again.'
      return fail('unauthorized', message, 401)
    }

    const user = await establishUserCard(result.userId)
    if (!user) return fail('forbidden', 'This account is not available.', 403)
    return ok({ ...result.tokens, user })
  })
}
