/** GET /api/v1/categories — active categories with live listing counts. */
import { activeCategories, categoryCounts } from '@/lib/db/listings'
import { ok, handle } from '@/lib/api/respond'

export async function GET(): Promise<Response> {
  return handle(async () => {
    const categories = await activeCategories()
    const counts = await categoryCounts(categories)
    return ok({
      categories: categories.map((c) => ({ ...c, listingCount: counts.get(c.id) ?? 0 })),
    })
  })
}
