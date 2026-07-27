import type { Metadata } from 'next'
import Link from 'next/link'
import { getViewer } from '@/lib/auth/session'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SearchControls } from '@/components/search/SearchControls'
import { SaveSearchButton } from '@/components/search/SaveSearchButton'
import { SmartSearchBox } from '@/components/search/SmartSearchBox'
import { CategoryChips } from '@/components/listing/CategoryChips'
import { ListingResults } from '@/components/listing/ListingResults'
import { HomeHero } from '@/components/home/HomeHero'
import { CategoryRail } from '@/components/home/CategoryRail'
import { TrustBar } from '@/components/home/TrustBar'
import { ContinueNegotiation } from '@/components/home/ContinueNegotiation'
import { HowItWorks } from '@/components/home/HowItWorks'
import { WhyAI } from '@/components/home/WhyAI'
import { Button } from '@/components/ui/button'
import {
  getActiveCategories,
  getCategoryBySlug,
  getFeaturedListings,
  getFilteredListings,
} from '@/lib/listings/queries'
import { getFavoritedIds } from '@/lib/favorites/queries'
import {
  getContinueNegotiation,
  getRecentlyViewed,
  getRecommended,
  getSavedSearchMatches,
} from '@/lib/personalization/queries'
import { parseSearch, type RawSearchParams } from '@/lib/listings/searchParams'
import {
  resolveAttributeFieldsForSlug,
  parseAttributeFilters,
} from '@/lib/listings/attributeSchemas'
import { getTrendingSearches } from '@/lib/search/intelligence'
import { absoluteUrl } from '@/lib/site'

const NO_MATCH = ['00000000-0000-0000-0000-000000000000']

/** True when the homepage is being used as a search/filter results view. */
function hasActiveFilters(parsed: ReturnType<typeof parseSearch>): boolean {
  return Boolean(
    parsed.q ||
      parsed.categorySlug ||
      parsed.emirate ||
      parsed.condition ||
      parsed.minFils ||
      parsed.maxFils ||
      parsed.negotiable ||
      parsed.featured ||
      parsed.sinceDays ||
      parsed.sort !== 'newest',
  )
}

/**
 * Filtered/search states of the homepage (e.g. /?q=iPhone, /?sort=price_asc)
 * are near-duplicate, low-value URLs — keep them out of the index (but still
 * let Google follow the links) and canonicalize back to the clean homepage.
 * The unfiltered homepage keeps the site's default index:true.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>
}): Promise<Metadata> {
  const parsed = parseSearch(await searchParams)
  if (hasActiveFilters(parsed)) {
    return { robots: { index: false, follow: true }, alternates: { canonical: '/' } }
  }
  // Canonical homepage sets its own og:url (root layout intentionally omits it
  // so it doesn't leak onto child pages).
  return { openGraph: { url: absoluteUrl('/') } }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>
}) {
  const sp = await searchParams
  const parsed = parseSearch(sp)
  const categories = await getActiveCategories()

  const hasFilters = Boolean(
    parsed.q ||
      parsed.categorySlug ||
      parsed.emirate ||
      parsed.condition ||
      parsed.minFils ||
      parsed.maxFils ||
      parsed.sort !== 'newest',
  )

  let categoryIds: string[] | undefined
  if (parsed.categorySlug) {
    const cat = await getCategoryBySlug(parsed.categorySlug)
    categoryIds = cat?.ids ?? NO_MATCH
  }

  // Category-specific facet filters (only meaningful once a category is chosen).
  const attributeFields = resolveAttributeFieldsForSlug(parsed.categorySlug, categories)
  const attributeFilters = parseAttributeFilters(attributeFields, sp)

  const { listings, count } = await getFilteredListings({
    q: parsed.q,
    categoryIds,
    emirate: parsed.emirate,
    condition: parsed.condition,
    minFils: parsed.minFils,
    maxFils: parsed.maxFils,
    negotiable: parsed.negotiable,
    featured: parsed.featured,
    sinceDays: parsed.sinceDays,
    sort: parsed.sort,
    attributes: attributeFilters,
  })

  const user = await getViewer()
  const favoritedIds = await getFavoritedIds(listings.map((l) => l.id))
  const trending = hasFilters ? [] : await getTrendingSearches(8)
  const featured = hasFilters ? [] : await getFeaturedListings(8)
  const featuredFav = featured.length
    ? await getFavoritedIds(featured.map((l) => l.id))
    : new Set<string>()

  // Personalized (signed-in, no active search). Empty arrays → sections hidden.
  const personalize = !hasFilters && !!user
  const [recentlyViewed, recommended, continueItems, savedMatches] = personalize
    ? await Promise.all([
        getRecentlyViewed(8),
        getRecommended(8),
        getContinueNegotiation(6),
        getSavedSearchMatches(8),
      ])
    : [[], [], [], null]
  const personalFav = personalize
    ? await getFavoritedIds(
        [...recentlyViewed, ...recommended, ...(savedMatches?.listings ?? [])].map((l) => l.id),
      )
    : new Set<string>()

  const feed = (
    <ListingResults listings={listings} count={count} favoritedIds={favoritedIds} authed={!!user} />
  )

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        {hasFilters ? (
          /* ---------- SEARCH RESULTS ---------- */
          <section id="listings" className="scroll-mt-20 py-8 sm:py-10">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="eyebrow">{count === 1 ? '1 result' : `${count.toLocaleString('en-AE')} results`}</p>
                <h1 className="font-display mt-1.5 truncate text-3xl tracking-tight sm:text-4xl">
                  {parsed.q?.trim() ? parsed.q : 'Browse listings'}
                </h1>
              </div>
              <SaveSearchButton authed={!!user} />
            </div>
            <div className="mb-6">
              <SmartSearchBox />
            </div>
            <div className="space-y-6">
              <SearchControls
                categories={categories}
                attributeFields={attributeFields}
                hideSearch
                hideCategory
              />
              <CategoryChips categories={categories} activeSlug={parsed.categorySlug} />
              <div className="pt-2">
                <ListingResults
                  listings={listings}
                  count={count}
                  favoritedIds={favoritedIds}
                  authed={!!user}
                  query={parsed.q}
                  resetHref="/"
                />
              </div>
            </div>
          </section>
        ) : (
          <>
            <HomeHero
              trending={trending.map((t) => t.query)}
              listings={(featured.length ? featured : listings).slice(0, 8)}
              favoritedIds={featured.length ? featuredFav : favoritedIds}
              authed={!!user}
            />

            {/* ---------- CATEGORIES ---------- */}
            <section className="py-6 sm:py-8">
              <h2 className="font-display mb-5 text-2xl tracking-tight sm:text-3xl">
                Browse by category
              </h2>
              <CategoryRail categories={categories} />
            </section>

            {/* ---------- TRUST ---------- */}
            <TrustBar />

            {/* ---------- PERSONALIZED (signed-in) ---------- */}
            {continueItems.length > 0 && (
              <section className="py-6 sm:py-8">
                <div className="mb-5">
                  <p className="eyebrow">Pick up where you left off</p>
                  <h2 className="font-display mt-1.5 text-2xl tracking-tight sm:text-3xl">
                    Continue negotiating
                  </h2>
                </div>
                <ContinueNegotiation items={continueItems} />
              </section>
            )}
            {savedMatches && savedMatches.listings.length > 0 && (
              <section className="py-6 sm:py-8">
                <div className="mb-5">
                  <p className="eyebrow">From your saved search</p>
                  <h2 className="font-display mt-1.5 text-2xl tracking-tight sm:text-3xl">
                    {savedMatches.label}
                  </h2>
                </div>
                <ListingResults
                  listings={savedMatches.listings}
                  count={savedMatches.listings.length}
                  favoritedIds={personalFav}
                  authed={!!user}
                />
              </section>
            )}
            {recommended.length > 0 && (
              <section className="py-6 sm:py-8">
                <div className="mb-5">
                  <p className="eyebrow">For you</p>
                  <h2 className="font-display mt-1.5 text-2xl tracking-tight sm:text-3xl">
                    Recommended for you
                  </h2>
                </div>
                <ListingResults
                  listings={recommended}
                  count={recommended.length}
                  favoritedIds={personalFav}
                  authed={!!user}
                />
              </section>
            )}
            {recentlyViewed.length > 0 && (
              <section className="py-6 sm:py-8">
                <div className="mb-5">
                  <p className="eyebrow">Recently viewed</p>
                  <h2 className="font-display mt-1.5 text-2xl tracking-tight sm:text-3xl">
                    Jump back in
                  </h2>
                </div>
                <ListingResults
                  listings={recentlyViewed}
                  count={recentlyViewed.length}
                  favoritedIds={personalFav}
                  authed={!!user}
                />
              </section>
            )}

            {/* ---------- LISTINGS (early) ---------- */}
            <section id="listings" className="scroll-mt-20 py-4 sm:py-6">
              <div className="mb-6 flex items-end justify-between gap-3">
                <div>
                  <p className="eyebrow">Fresh finds</p>
                  <h2 className="font-display mt-1.5 text-2xl tracking-tight sm:text-3xl">
                    Recently added
                  </h2>
                </div>
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link href="/sell">Sell yours</Link>
                </Button>
              </div>
              <div className="space-y-5">
                <CategoryChips categories={categories} activeSlug={parsed.categorySlug} />
                <div className="pt-1">{feed}</div>
              </div>
            </section>

            {/* ---------- HOW IT WORKS ---------- */}
            <section className="py-6 sm:py-10">
              <div className="mb-7">
                <p className="eyebrow">How it works</p>
                <h2 className="font-display mt-1.5 text-3xl tracking-tight sm:text-4xl">
                  From photo to published in under a minute
                </h2>
              </div>
              <HowItWorks />
            </section>

            {/* ---------- WHY AI ---------- */}
            <section className="pb-12 sm:pb-16">
              <WhyAI />
            </section>

            {/* ---------- FINAL CTA ---------- */}
            <section className="border-t border-border py-14 text-center sm:py-20">
              <h2 className="font-display mx-auto max-w-xl text-3xl tracking-tight sm:text-4xl">
                Have something to sell?
              </h2>
              <p className="mx-auto mt-4 max-w-md text-muted-foreground">
                List it in under a minute and reach buyers across the UAE.
              </p>
              <Button asChild size="lg" className="mt-7 rounded-full px-8">
                <Link href="/sell">Start Selling</Link>
              </Button>
            </section>
          </>
        )}
      </main>

      <SiteFooter />
    </>
  )
}
