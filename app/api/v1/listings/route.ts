/**
 * GET /api/v1/listings — the filtered public feed (search results, category
 * browse, home sections). Wraps lib/db/listings.ts#filteredListings with the
 * @qb/shared filter grammar; offset pagination for the mobile infinite feed.
 */
import { ListingFiltersSchema } from '@qb/shared'
import { filteredListings, categoryBySlug, type ListingFilters } from '@/lib/db/listings'
import { parseQuery } from '@/lib/api/validate'
import { ok, handle } from '@/lib/api/respond'

export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    const parsed = parseQuery(req, ListingFiltersSchema)
    if (!parsed.ok) return parsed.response
    const f = parsed.data

    let categoryIds: string[] | undefined
    if (f.category) {
      const cat = await categoryBySlug(f.category)
      if (!cat) return ok({ listings: [], count: 0, nextOffset: null })
      categoryIds = cat.ids
    }

    const repoFilters: ListingFilters = {
      q: f.q,
      categoryIds,
      emirate: f.emirate,
      condition: f.condition,
      minFils: f.minAed !== undefined ? Math.round(f.minAed * 100) : undefined,
      maxFils: f.maxAed !== undefined ? Math.round(f.maxAed * 100) : undefined,
      negotiable: f.negotiable || undefined,
      featured: f.featured || undefined,
      sinceDays: f.sinceDays,
      sort: f.sort,
      limit: f.limit,
      offset: f.offset,
    }

    const { listings, count } = await filteredListings(repoFilters)
    const nextOffset = f.offset + listings.length < count ? f.offset + listings.length : null
    return ok({ listings, count, nextOffset })
  })
}
