import { createClient } from '@/utils/supabase/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SearchControls } from '@/components/search/SearchControls'
import { SaveSearchButton } from '@/components/search/SaveSearchButton'
import { ConversationalSearchBox } from '@/components/search/ConversationalSearchBox'
import { CategoryChips } from '@/components/listing/CategoryChips'
import { ListingResults } from '@/components/listing/ListingResults'
import {
  getActiveCategories,
  getCategoryBySlug,
  getFilteredListings,
} from '@/lib/listings/queries'
import { getFavoritedIds } from '@/lib/favorites/queries'
import { parseSearch, type RawSearchParams } from '@/lib/listings/searchParams'

const NO_MATCH = ['00000000-0000-0000-0000-000000000000'] // unknown category slug → no results

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>
}) {
  const sp = await searchParams
  const parsed = parseSearch(sp)
  const categories = await getActiveCategories()

  let categoryIds: string[] | undefined
  if (parsed.categorySlug) {
    const cat = await getCategoryBySlug(parsed.categorySlug)
    categoryIds = cat?.ids ?? NO_MATCH
  }

  const { listings, count } = await getFilteredListings({
    q: parsed.q,
    categoryIds,
    emirate: parsed.emirate,
    condition: parsed.condition,
    minFils: parsed.minFils,
    maxFils: parsed.maxFils,
    sort: parsed.sort,
  })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const favoritedIds = await getFavoritedIds(listings.map((l) => l.id))

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Browse the marketplace</h1>
            <p className="text-sm text-muted-foreground">Buy and sell across the UAE.</p>
          </div>
          <SaveSearchButton authed={!!user} />
        </div>

        <ConversationalSearchBox />
        <SearchControls categories={categories} />
        <CategoryChips categories={categories} activeSlug={parsed.categorySlug} />
        <ListingResults
          listings={listings}
          count={count}
          favoritedIds={favoritedIds}
          authed={!!user}
        />
      </main>
    </>
  )
}
