import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeftIcon } from 'lucide-react'
import { getViewer } from '@/lib/auth/session'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SearchControls } from '@/components/search/SearchControls'
import { ListingResults } from '@/components/listing/ListingResults'
import { CityLinks } from '@/components/category/CityLinks'
import { CategorySeoContent } from '@/components/category/CategorySeoContent'
import { RelatedGuides } from '@/components/category/RelatedGuides'
import {
  getActiveCategories,
  getCategoryBySlug,
  getFilteredListings,
  categoryAncestry,
} from '@/lib/listings/queries'
import { getFavoritedIds } from '@/lib/favorites/queries'
import { parseSearch, type RawSearchParams } from '@/lib/listings/searchParams'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbJsonLd, faqJsonLd, itemListJsonLd } from '@/lib/seo'
import {
  categoryFaqs,
  categoryIntro,
  categoryMetaDescription,
  categoryHeading,
} from '@/lib/seo/categoryContent'
import { absoluteUrl } from '@/lib/site'
import { citySlugToEmirate, emirateBySlug } from '@/lib/profile/emirates'
import { listingPath } from '@/lib/listings/slug'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; city: string }>
}): Promise<Metadata> {
  const { slug, city } = await params
  const cityRec = emirateBySlug(city)
  const cat = await getCategoryBySlug(slug)
  if (!cat || !cityRec) return { title: 'Not found · Query & Buy' }

  const name = cat.category.name_en
  const title = `${categoryHeading(name, `${cityRec.label}, UAE`)} · Query & Buy`
  const description = categoryMetaDescription(slug, name, cityRec.label)
  const path = `/category/${slug}/${city}`
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      title,
      description,
      url: absoluteUrl(path),
      locale: 'en_AE',
    },
  }
}

export default async function CategoryCityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; city: string }>
  searchParams: Promise<RawSearchParams>
}) {
  const { slug, city } = await params
  const cityRec = emirateBySlug(city)
  const cat = await getCategoryBySlug(slug)
  if (!cat || !cityRec) notFound()

  const emirate = citySlugToEmirate(city) ?? undefined
  const name = cat.category.name_en
  const parsed = parseSearch(await searchParams)
  const categories = await getActiveCategories()

  const { listings, count } = await getFilteredListings({
    q: parsed.q,
    categoryIds: cat.ids, // this category + its children
    emirate, // fixed by the route (city), not user-overridable here
    condition: parsed.condition,
    minFils: parsed.minFils,
    maxFils: parsed.maxFils,
    negotiable: parsed.negotiable,
    featured: parsed.featured,
    sinceDays: parsed.sinceDays,
    sort: parsed.sort,
  })

  const user = await getViewer()
  const favoritedIds = await getFavoritedIds(listings.map((l) => l.id))

  const { lead } = categoryIntro(slug, name, cityRec.label)
  const path = `/category/${slug}/${city}`

  return (
    <>
      <SiteHeader />
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            ...categoryAncestry(categories, slug).map((c) => ({
              name: c.name,
              path: `/category/${c.slug}`,
            })),
            { name: cityRec.label, path },
          ]),
          itemListJsonLd(
            listings.map((l) => ({ name: l.title_en, path: listingPath(l.title_en, l.id) })),
            { name: `${name} in ${cityRec.label}` },
          ),
          faqJsonLd(categoryFaqs(slug, name, cityRec.label)),
        ]}
      />
      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href={`/category/${slug}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" /> All {name}
        </Link>

        <div>
          <p className="eyebrow">
            {name} · {cityRec.label}
          </p>
          <h1 className="font-display mt-2 text-3xl tracking-tight sm:text-4xl">
            {categoryHeading(name, cityRec.label)}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{lead}</p>
        </div>

        <CityLinks categorySlug={slug} categoryName={name} activeCity={city} />

        {/* Category and city are fixed by the route, so hide category from filters. */}
        <SearchControls categories={categories} hideCategory />
        <ListingResults
          listings={listings}
          count={count}
          favoritedIds={favoritedIds}
          authed={!!user}
        />

        <CategorySeoContent slug={slug} name={name} city={cityRec.label} />

        <RelatedGuides categorySlug={slug} />
      </main>
      <SiteFooter />
    </>
  )
}
