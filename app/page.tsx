import Link from 'next/link'
import { TrendingUpIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SearchControls } from '@/components/search/SearchControls'
import { SaveSearchButton } from '@/components/search/SaveSearchButton'
import { SmartSearchBox } from '@/components/search/SmartSearchBox'
import { CategoryChips } from '@/components/listing/CategoryChips'
import { ListingResults } from '@/components/listing/ListingResults'
import { TrustStats } from '@/components/home/TrustStats'
import { CategoryShowcase } from '@/components/home/CategoryShowcase'
import { ContinueNegotiation } from '@/components/home/ContinueNegotiation'
import { HowItWorks } from '@/components/home/HowItWorks'
import { WhyAI } from '@/components/home/WhyAI'
import { Button } from '@/components/ui/button'
import {
  getActiveCategories,
  getCategoryBySlug,
  getCategoryCounts,
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
import { getTrendingSearches } from '@/lib/search/intelligence'

const NO_MATCH = ['00000000-0000-0000-0000-000000000000']
const POPULAR = ['iPhone', 'Toyota', 'PlayStation 5', 'Apartment in Dubai', 'Rolex']

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
  })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const favoritedIds = await getFavoritedIds(listings.map((l) => l.id))
  const counts = hasFilters ? undefined : await getCategoryCounts(categories)
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
              <div>
                <p className="eyebrow">Results</p>
                <h1 className="font-display mt-1.5 text-3xl tracking-tight">Search</h1>
              </div>
              <SaveSearchButton authed={!!user} />
            </div>
            <div className="mb-6">
              <SmartSearchBox />
            </div>
            <div className="space-y-6">
              <SearchControls categories={categories} />
              <CategoryChips categories={categories} activeSlug={parsed.categorySlug} />
              <div className="pt-2">{feed}</div>
            </div>
          </section>
        ) : (
          <>
            {/* ---------- COMPACT HERO ---------- */}
            <section className="animate-rise pb-8 pt-10 text-center sm:pb-10 sm:pt-14">
              <p className="eyebrow">AI Marketplace · United Arab Emirates</p>
              <h1 className="font-display mx-auto mt-5 max-w-3xl text-[2.6rem] leading-[1.03] tracking-tight sm:text-6xl">
                Snap. Sell. Done.
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Create a listing from your photos in seconds — buy &amp; sell beautifully across the
                Emirates.
              </p>
              <div className="mx-auto mt-7 max-w-2xl">
                <SmartSearchBox trending={trending.map((t) => t.query)} />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="eyebrow mr-1">Popular</span>
                {POPULAR.map((q) => (
                  <Link
                    key={q}
                    href={`/?q=${encodeURIComponent(q)}`}
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:border-gold/40 hover:text-foreground"
                  >
                    {q}
                  </Link>
                ))}
              </div>
            </section>

            {/* ---------- TRENDING TODAY (real search frequency) ---------- */}
            {trending.length > 0 && (
              <section className="py-6 sm:py-8">
                <div className="mb-4 flex items-center gap-2">
                  <TrendingUpIcon className="size-4 text-gold" />
                  <h2 className="font-display text-xl tracking-tight sm:text-2xl">Trending today</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {trending.map((t) => (
                    <Link
                      key={t.query}
                      href={`/?q=${encodeURIComponent(t.query)}`}
                      className="lift rounded-full border border-border bg-card px-3.5 py-1.5 text-sm shadow-soft transition hover:border-gold/40 hover:text-foreground"
                    >
                      {t.query}
                    </Link>
                  ))}
                </div>
              </section>
            )}

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

            {/* ---------- CATEGORIES ---------- */}
            <section className="py-8 sm:py-10">
              <div className="mb-5">
                <p className="eyebrow">Discover</p>
                <h2 className="font-display mt-1.5 text-2xl tracking-tight sm:text-3xl">
                  Browse by category
                </h2>
              </div>
              <CategoryShowcase categories={categories} counts={counts} />
            </section>

            {/* ---------- FEATURED (admin-curated) ---------- */}
            {featured.length > 0 && (
              <section className="py-6 sm:py-8">
                <div className="mb-5">
                  <p className="eyebrow text-gold">★ Handpicked</p>
                  <h2 className="font-display mt-1.5 text-2xl tracking-tight sm:text-3xl">
                    Featured listings
                  </h2>
                </div>
                <ListingResults
                  listings={featured}
                  count={featured.length}
                  favoritedIds={featuredFav}
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
              <div className="space-y-6">
                <SearchControls categories={categories} />
                <CategoryChips categories={categories} activeSlug={parsed.categorySlug} />
                <div className="pt-2">{feed}</div>
              </div>
            </section>

            {/* ---------- TRUST STATS ---------- */}
            <section className="py-10 sm:py-14">
              <TrustStats listings={count} />
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
