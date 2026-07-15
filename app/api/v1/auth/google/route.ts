/**
 * POST /api/v1/auth/google — Google sign-in with a device-obtained id_token.
 * Verifies against Google JWKS (lib/api/idTokens.ts), then resolves/creates
 * the local user exactly like the web flow (lib/auth/oauth.ts).
 */
import { OAuthTokenSchema } from '@qb/shared'
import { verifyGoogleIdToken } from '@/lib/api/idTokens'
import { resolveOAuthUser } from '@/lib/auth/oauth'
import { establishSession } from '@/lib/api/session'
import { parseBody } from '@/lib/api/validate'
import { apiRateLimit } from '@/lib/api/rateLimit'
import { ok, fail, handle } from '@/lib/api/respond'

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const limited = apiRateLimit(req, null, 'auth-oauth', 10, 60_000)
    if (limited) return limited

    const parsed = await parseBody(req, OAuthTokenSchema)
    if (!parsed.ok) return parsed.response

    const identity = await verifyGoogleIdToken(parsed.data.idToken)
    if (!identity) return fail('unauthorized', 'Google sign-in could not be verified.', 401)

    const userId = await resolveOAuthUser(identity)
    if (!userId) return fail('unauthorized', 'Google account has no verified email.', 401)

    const session = await establishSession(userId)
    if (!session) return fail('forbidden', 'This account is not available.', 403)
    return ok(session)
  })
}
