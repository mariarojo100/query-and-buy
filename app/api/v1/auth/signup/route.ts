/**
 * POST /api/v1/auth/signup — email/password registration (mobile).
 * Reuses lib/auth/signup.ts (same path as the web signup action), then
 * establishes a token session. Email-verification sending is wired the same
 * way as the web flow (token produced; email dispatch is the caller's hook).
 */
import { SignupSchema } from '@qb/shared'
import { registerWithPassword, SignupError } from '@/lib/auth/signup'
import { establishSession } from '@/lib/api/session'
import { parseBody } from '@/lib/api/validate'
import { apiRateLimit } from '@/lib/api/rateLimit'
import { ok, fail, serverError, handle } from '@/lib/api/respond'

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const limited = apiRateLimit(req, null, 'auth-signup', 5, 60_000)
    if (limited) return limited

    const parsed = await parseBody(req, SignupSchema)
    if (!parsed.ok) return parsed.response

    try {
      const { userId } = await registerWithPassword(parsed.data)
      const session = await establishSession(userId)
      if (!session) return serverError()
      return ok(session, { status: 201 })
    } catch (e) {
      if (e instanceof SignupError) return fail('conflict', e.message, 409)
      throw e
    }
  })
}
