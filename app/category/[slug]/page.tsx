import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeftIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
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
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbJsonLd } from '@/lib/seo'
import { absoluteUrl } from '@/lib/site'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const cat = await getCategoryBySlug(slug)
  if (!cat) return { title: 'Category not found · Query & Buy' }
  const description = `Buy and sell ${cat.category.name_en} across the UAE on Query & Buy.`
  return {
    title: `${cat.category.name_en} · Query & Buy`,
    description,
    alternates: { canonical: `/category/${slug}` },
    openGraph: {
      type: 'website',
      title: `${cat.category.name_en} · Query & Buy`,
      description,
      url: absoluteUrl(`/category/${slug}`),
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

  const parsed = parseSearch(await searchParams)
  const categories = await getActiveCategories()

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
  })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const favoritedIds = await getFavoritedIds(listings.map((l) => l.id))

  return (
    <>
      <SiteHeader />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: cat.category.name_en, path: `/category/${slug}` },
        ])}
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
            {cat.category.name_en}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Listings in {cat.category.name_en} across the UAE.
          </p>
        </div>

        <CategoryChips categories={categories} activeSlug={slug} />
        {/* Category is fixed by the route, so hide it from the filters. */}
        <SearchControls categories={categories} hideCategory />
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
