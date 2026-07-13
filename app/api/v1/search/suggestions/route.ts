/** GET /api/v1/search/suggestions?prefix= — typeahead (trending when empty). */
import { z } from 'zod'
import { getSearchSuggestions } from '@/lib/search/intelligence'
import { parseQuery } from '@/lib/api/validate'
import { ok, handle } from '@/lib/api/respond'

const QuerySchema = z.object({ prefix: z.string().trim().max(80).default('') })

export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    const parsed = parseQuery(req, QuerySchema)
    if (!parsed.ok) return parsed.response
    return ok({ suggestions: await getSearchSuggestions(parsed.data.prefix) })
  })
}
