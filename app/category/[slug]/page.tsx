import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeftIcon } from 'lucide-react'
import { getViewer } from '@/lib/auth/session'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SearchControls } from '@/components/search/SearchControls'
import { CategoryChips } from '@/components/listing/CategoryChips'
import { ListingResults } from '@/components/listing/ListingResults'
import {
  getActiveCategories,
  getCategoryBySlug,
  getFilteredListings,
} from '@/lib/listings/queries'
import { getFavoritedIds } from '@/lib/favorites/queries'
import { parseSearch, type RawSearchParams } from '@/lib/listings/searchParams'
import {
  resolveAttributeFieldsForSlug,
  parseAttributeFilters,
} from '@/lib/listings/attributeSchemas'
import { CityLinks } from '@/components/category/CityLinks'
import { CategorySeoContent } from '@/components/category/CategorySeoContent'
import { RelatedGuides } from '@/components/category/RelatedGuides'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbJsonLd, faqJsonLd, itemListJsonLd } from '@/lib/seo'
import { categoryFaqs, categoryIntro, categoryMetaDescription } from '@/lib/seo/categoryContent'
import { absoluteUrl } from '@/lib/site'
import { listingPath } from '@/lib/listings/slug'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const cat = await getCategoryBySlug(slug)
  if (!cat) return { title: 'Category not found · Query & Buy' }
  const name = cat.category.name_en
  const description = categoryMetaDescription(slug, name)
  return {
    title: `${name} for Sale in the UAE · Query & Buy`,
    description,
    alternates: { canonical: `/category/${slug}` },
    openGraph: {
      type: 'website',
      title: `${name} for Sale in the UAE · Query & Buy`,
      description,
      url: absoluteUrl(`/category/${slug}`),
      locale: 'en_AE',
    },
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<RawSearchParams>
}) {
  const { slug } = await params
  const cat = await getCategoryBySlug(slug)
  if (!cat) notFound()

  const name = cat.category.name_en
  const { lead } = categoryIntro(slug, name)
  const sp = await searchParams
  const parsed = parseSearch(sp)
  const categories = await getActiveCategories()

  // Facet filters for this category (from the route slug).
  const attributeFields = resolveAttributeFieldsForSlug(slug, categories)
  const attributeFilters = parseAttributeFilters(attributeFields, sp)

  const { listings, count } = await getFilteredListings({
    q: parsed.q,
    categoryIds: cat.ids, // this category + its children
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

  return (
    <>
      <SiteHeader />
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name, path: `/category/${slug}` },
          ]),
          itemListJsonLd(
            listings.map((l) => ({ name: l.title_en, path: listingPath(l.title_en, l.id) })),
            { name },
          ),
          faqJsonLd(categoryFaqs(slug, name)),
        ]}
      />
      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" /> All listings
        </Link>

        <div>
          <p className="eyebrow">Category</p>
          <h1 className="font-display mt-2 text-3xl tracking-tight sm:text-4xl">
            {name} for Sale in the UAE
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{lead}</p>
        </div>

        <CityLinks categorySlug={slug} categoryName={name} />

        <CategoryChips categories={categories} activeSlug={slug} />
        {/* Category is fixed by the route, so hide it from the filters. */}
        <SearchControls categories={categories} attributeFields={attributeFields} hideCategory />
        <ListingResults
          listings={listings}
          count={count}
          favoritedIds={favoritedIds}
          authed={!!user}
        />

        <CategorySeoContent slug={slug} name={name} />

        <RelatedGuides categorySlug={slug} />
      </main>
    </>
  )
}
