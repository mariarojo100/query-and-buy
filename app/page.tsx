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
import { JsonLd } from '@/components/seo/JsonLd'
import { itemListJsonLd } from '@/lib/seo'
import { listingPath } from '@/lib/listings/slug'
import { HomeHero } from '@/components/home/HomeHero'
import { CategoryRail } from '@/components/home/CategoryRail'
import { SectionHeading } from '@/components/home/SectionHeading'
import { TrustBar } from '@/components/home/TrustBar'
import { ContinueNegotiation } from '@/components/home/ContinueNegotiation'
import { HowItWorks } from '@/components/home/HowItWorks'
import { WhyAI } from '@/components/home/WhyAI'
import { GuidesStrip } from '@/components/home/GuidesStrip'
import { ConversionCTA } from '@/components/home/ConversionCTA'
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

  // A representative cover photo per top-level category, drawn from the real
  // listings already loaded — so the category tiles show imagery, not icons.
  const catBySlug = new Map(categories.map((c) => [c.slug, c]))
  const catById = new Map(categories.map((c) => [c.id, c]))
  const categoryCovers: Record<string, string> = {}
  for (const l of [...featured, ...listings]) {
    if (!l.cover_key || !l.category_slug) continue
    const cat = catBySlug.get(l.category_slug)
    if (!cat) continue
    const parentSlug = cat.parent_id ? (catById.get(cat.parent_id)?.slug ?? cat.slug) : cat.slug
    if (!(parentSlug in categoryCovers)) categoryCovers[parentSlug] = l.cover_key
  }

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
            {listings.length > 0 && (
              <JsonLd
                data={itemListJsonLd(
                  listings.map((l) => ({ name: l.title_en, path: listingPath(l.title_en, l.public_id) })),
                  { name: 'Recently added on Query & Buy' },
                )}
              />
            )}
            <HomeHero
              trending={trending.map((t) => t.query)}
              listings={[...featured, ...listings]
                .filter((l, i, a) => a.findIndex((x) => x.id === l.id) === i)
                .slice(0, 15)}
              categories={categories}
              favoritedIds={featured.length ? featuredFav : favoritedIds}
              authed={!!user}
            />

            {/* ---------- CATEGORIES ---------- */}
            <section className="py-8 sm:py-11">
              <SectionHeading title="Browse by category" />
              <CategoryRail categories={categories} covers={categoryCovers} />
            </section>

            {/* ---------- TRUST ---------- */}
            <TrustBar />

            {/* ---------- PERSONALIZED (signed-in) ---------- */}
            {continueItems.length > 0 && (
              <section className="py-6 sm:py-8">
                <div className="mb-5">
                  <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
                    Continue negotiating
                  </h2>
                </div>
                <ContinueNegotiation items={continueItems} />
              </section>
            )}
            {savedMatches && savedMatches.listings.length > 0 && (
              <section className="py-6 sm:py-8">
                <div className="mb-5">
                  <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
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
                  <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
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
                  <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
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
            <section id="listings" className="scroll-mt-20 py-8 sm:py-11">
              <SectionHeading title="Recently added">
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link href="/sell">Sell yours</Link>
                </Button>
              </SectionHeading>
              <div className="space-y-5">
                <CategoryChips categories={categories} activeSlug={parsed.categorySlug} />
                <div className="pt-1">{feed}</div>
              </div>
            </section>

            {/* ---------- HOW IT WORKS ---------- */}
            <section className="py-8 sm:py-11">
              <SectionHeading title="From photo to published" />
              <HowItWorks />
            </section>

            {/* ---------- GUIDES ---------- */}
            <GuidesStrip />

            {/* ---------- WHY AI ---------- */}
            <section className="pb-12 sm:pb-16">
              <WhyAI />
            </section>

            {/* ---------- FINAL CTA ---------- */}
            <ConversionCTA listings={featured.length ? featured : listings} />
          </>
        )}
      </main>

      <SiteFooter />
    </>
  )
}
