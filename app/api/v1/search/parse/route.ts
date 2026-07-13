/**
 * POST /api/v1/search/parse — natural-language query → structured filters.
 * Works signed-out (heuristic + provider quota); signed-in users get the AI
 * path with the per-user cap. Never fails — always returns usable filters.
 */
import { z } from 'zod'
import { getApiViewer } from '@/lib/api/auth'
import { parseConversationalSearchAs } from '@/lib/search/parseService'
import { parseBody } from '@/lib/api/validate'
import { ok, handle } from '@/lib/api/respond'

const BodySchema = z.object({ text: z.string().trim().min(1).max(300) })

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const viewer = await getApiViewer(req)
    const parsed = await parseBody(req, BodySchema)
    if (!parsed.ok) return parsed.response
    return ok(await parseConversationalSearchAs(viewer, parsed.data.text))
  })
}
