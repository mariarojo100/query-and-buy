/** GET /api/v1/me/username-check?username= — live availability check. */
import { z } from 'zod'
import { getApiViewer } from '@/lib/api/auth'
import { usernameAvailable } from '@/lib/db/profiles'
import { normalizeUsername, USERNAME_RE } from '@/lib/profile/completion'
import { parseQuery } from '@/lib/api/validate'
import { ok, handle } from '@/lib/api/respond'

const QuerySchema = z.object({ username: z.string().min(1).max(60) })

export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    const parsed = parseQuery(req, QuerySchema)
    if (!parsed.ok) return parsed.response

    const username = normalizeUsername(parsed.data.username)
    if (!USERNAME_RE.test(username)) return ok({ available: false, reason: 'invalid' })

    const viewer = await getApiViewer(req)
    const available = await usernameAvailable(username, viewer?.id ?? null)
    return ok(available ? { available: true } : { available: false, reason: 'taken' })
  })
}
