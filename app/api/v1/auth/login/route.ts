/**
 * POST /api/v1/auth/login — email/password sign-in (mobile).
 * Same verification as the web's Auth.js Credentials provider
 * (lib/auth/credentials.ts); returns a TokenPair instead of a cookie.
 */
import { LoginSchema } from '@qb/shared'
import { verifyCredentials } from '@/lib/auth/credentials'
import { establishSession } from '@/lib/api/session'
import { parseBody } from '@/lib/api/validate'
import { apiRateLimit } from '@/lib/api/rateLimit'
import { ok, fail, handle } from '@/lib/api/respond'

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const limited = apiRateLimit(req, null, 'auth-login', 10, 60_000)
    if (limited) return limited

    const parsed = await parseBody(req, LoginSchema)
    if (!parsed.ok) return parsed.response

    const verified = await verifyCredentials(parsed.data.email, parsed.data.password)
    if (!verified) return fail('unauthorized', 'Incorrect email or password.', 401)

    const session = await establishSession(verified.userId)
    if (!session) return fail('unauthorized', 'Incorrect email or password.', 401)
    return ok(session)
  })
}
