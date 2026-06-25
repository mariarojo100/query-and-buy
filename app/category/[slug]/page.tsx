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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const cat = await getCategoryBySlug(slug)
  if (!cat) return { title: 'Category not found · Query & Buy' }
  return {
    title: `${cat.category.name_en} · Query & Buy`,
    description: `Buy and sell ${cat.category.name_en} across the UAE.`,
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
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" /> All listings
        </Link>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{cat.category.name_en}</h1>
          <p className="text-sm text-muted-foreground">
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
