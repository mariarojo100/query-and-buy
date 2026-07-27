/**
 * POST /api/v1/search/parse — natural-language query → structured filters.
 * Works signed-out (heuristic + provider quota); signed-in users get the AI
 * path with the per-user cap. Never fails — always returns usable filters.
 */
import { z } from 'zod'
import { getApiViewer } from '@/lib/api/auth'
import { parseConversationalSearchAs } from '@/lib/search/parseService'
import { parseBody } from '@/lib/api/validate'
import { apiRateLimit } from '@/lib/api/rateLimit'
import { ok, handle } from '@/lib/api/respond'

const BodySchema = z.object({ text: z.string().trim().min(1).max(300) })

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    // Cap the AI parse for everyone — keyed by viewer id, else client IP. The
    // service only rate-limits signed-in users, so this closes the anonymous
    // path (unbounded paid AI calls / DoS).
    const limited = apiRateLimit(req, viewer, 'search-parse', 30, 60_000)
    if (limited) return limited

    const parsed = await parseBody(req, BodySchema)
    if (!parsed.ok) return parsed.response
    return ok(await parseConversationalSearchAs(viewer, parsed.data.text))
  })
}
