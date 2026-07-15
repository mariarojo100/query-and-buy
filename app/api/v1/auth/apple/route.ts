/**
 * POST /api/v1/auth/apple — Sign in with Apple (App Store requirement).
 * The device presents the identityToken from expo-apple-authentication;
 * verified against Apple JWKS, then resolved like any OAuth identity.
 * Note: Apple sends the user's name only in the FIRST authorization — the
 * client may pass it along; we accept it only when creating a new account.
 */
import { z } from 'zod'
import { OAuthTokenSchema } from '@qb/shared'
import { verifyAppleIdToken } from '@/lib/api/idTokens'
import { resolveOAuthUser } from '@/lib/auth/oauth'
import { establishSession } from '@/lib/api/session'
import { parseBody } from '@/lib/api/validate'
import { apiRateLimit } from '@/lib/api/rateLimit'
import { ok, fail, handle } from '@/lib/api/respond'

const AppleBodySchema = OAuthTokenSchema.extend({
  /** Optional display name from the first Apple authorization response. */
  fullName: z.string().trim().max(120).optional(),
})

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const limited = apiRateLimit(req, null, 'auth-oauth', 10, 60_000)
    if (limited) return limited

    const parsed = await parseBody(req, AppleBodySchema)
    if (!parsed.ok) return parsed.response

    const identity = await verifyAppleIdToken(parsed.data.idToken)
    if (!identity) return fail('unauthorized', 'Apple sign-in could not be verified.', 401)

    const userId = await resolveOAuthUser({ ...identity, name: parsed.data.fullName ?? null })
    if (!userId) return fail('unauthorized', 'Apple account has no verified email.', 401)

    const session = await establishSession(userId)
    if (!session) return fail('forbidden', 'This account is not available.', 403)
    return ok(session)
  })
}
