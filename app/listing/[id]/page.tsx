import type { Metadata } from 'next'
import Link from 'next/link'
import { maskContactInfo } from '@/lib/safety/contact'
import { notFound, permanentRedirect } from 'next/navigation'
import { ChevronLeftIcon, PencilIcon, ShieldCheckIcon } from 'lucide-react'
import { getViewer } from '@/lib/auth/session'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { ImageGallery } from '@/components/listing/ImageGallery'
import { ContactSellerButton } from '@/components/listing/ContactSellerButton'
import { FavoriteButton } from '@/components/listing/FavoriteButton'
import { StickyContactBar } from '@/components/listing/StickyContactBar'
import { ReportButton } from '@/components/report/ReportButton'
import { getFavoritedIds } from '@/lib/favorites/queries'
import { Button } from '@/components/ui/button'
import { statusMeta } from '@/lib/listings/status'
import { SellerTrustCard } from '@/components/trust/SellerTrustCard'
import { SellerReputation } from '@/components/trust/SellerReputation'
import { TrackView } from '@/components/listing/TrackView'
import { getSellerReputation } from '@/lib/reputation/queries'
import { formatPrice } from '@/lib/format'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import { emirateLabel } from '@/lib/profile/emirates'
import { conditionLabel } from '@/lib/listings/conditions'
import { ListingCard } from '@/components/listing/ListingCard'
import { getListingById, getSellerListings, getSimilarListings } from '@/lib/listings/queries'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbJsonLd, productJsonLd } from '@/lib/seo'
import { absoluteUrl } from '@/lib/site'
import { extractListingId, listingSlug } from '@/lib/listings/slug'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id: param } = await params
  const listingId = extractListingId(param)
  const listing = listingId ? await getListingById(listingId) : null
  if (!listing) return { title: 'Listing not found · Query & Buy' }
  const desc = maskContactInfo(listing.description).slice(0, 155)
  const img = listing.images[0]
    ? publicUrl(LISTING_IMAGES_BUCKET, listing.images[0].storage_key)
    : undefined
  const slug = listingSlug(listing.title_en, listing.id)
  return {
    title: `${listing.title_en} · Query & Buy`,
    description: desc,
    alternates: { canonical: `/listing/${slug}` },
    openGraph: {
      type: 'website',
      title: listing.title_en,
      description: desc,
      url: absoluteUrl(`/listing/${slug}`),
      images: img ? [img] : undefined,
    },
    twitter: {
      card: img ? 'summary_large_image' : 'summary',
      title: listing.title_en,
      description: desc,
      images: img ? [img] : undefined,
    },
  }
}

function Spec({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1.5 text-sm">{value}</dd>
    </div>
  )
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: param } = await params
  const listingId = extractListingId(param)
  if (!listingId) notFound()
  const listing = await getListingById(listingId)
  if (!listing) notFound()

  // Canonicalise the URL: redirect bare-UUID or stale-slug requests to the
  // keyword slug so there's a single indexable URL per listing.
  const canonicalSlug = listingSlug(listing.title_en, listing.id)
  if (param !== canonicalSlug) permanentRedirect(`/listing/${canonicalSlug}`)

  const user = await getViewer()
  const isOwner = user?.id === listing.seller_id
  const favorited = (await getFavoritedIds([listing.id])).has(listing.id)

  const related = await getSellerListings(listing.seller_id, { excludeId: listing.id, limit: 4 })
  const relatedFav = await getFavoritedIds(related.map((l) => l.id))
  const similar = await getSimilarListings(listing.id, 8)
  const similarFav = await getFavoritedIds(similar.map((l) => l.id))
  const sellerRep = await getSellerReputation(listing.seller_id, { withResponse: true })

  const location = [listing.area, emirateLabel(listing.emirate)].filter(Boolean).join(', ')
  const posted = listing.published_at ?? listing.created_at
  const seller = listing.seller
  const status = statusMeta(listing.status)
  const priceLabel = formatPrice(listing.price_fils, listing.currency)
  const postedLabel = new Date(posted).toLocaleDateString('en-AE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <>
      <SiteHeader />
      <TrackView listingId={listing.id} />
      <JsonLd
        data={[
          productJsonLd({
            id: listing.id,
            title: listing.title_en,
            description: listing.description,
            priceAed: listing.price_fils / 100,
            condition: listing.condition,
            imageUrls: listing.images.map((im) => publicUrl(LISTING_IMAGES_BUCKET, im.storage_key)),
            sellerName: seller?.display_name ?? null,
            available: listing.status === 'active',
          }),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            ...(listing.category_slug && listing.category_name
              ? [{ name: listing.category_name, path: `/category/${listing.category_slug}` }]
              : []),
            { name: listing.title_en, path: `/listing/${canonicalSlug}` },
          ]),
        ]}
      />
      <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-10">
        <Link
          href="/"
          className="eyebrow mb-6 inline-flex items-center gap-1 transition-colors hover:text-foreground"
        >
          <ChevronLeftIcon className="size-3.5" />
          Marketplace
        </Link>

        {isOwner && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
            <p className="flex items-center gap-2.5 text-sm">
              <span className="eyebrow">{status.label}</span>
              <span className="text-muted-foreground">This is your listing.</span>
            </p>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href={`/listing/${listing.id}/edit`}>
                <PencilIcon className="size-4" />
                Edit
              </Link>
            </Button>
          </div>
        )}

        {/* Blocks stay in reading order for narrow screens — gallery, then the
            title/price/CTA details, then the long description. On lg the explicit
            grid placement restores the two-column layout: gallery top-left, sticky
            details on the right (spanning both rows), description bottom-left. */}
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-12 lg:gap-x-12 lg:gap-y-8">
          {/* Gallery */}
          <div className="lg:col-span-7 lg:col-start-1 lg:row-start-1">
            <ImageGallery keys={listing.images.map((i) => i.storage_key)} title={listing.title_en} />
          </div>

          {/* Details */}
          <div className="lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:row-span-2">
            <div className="lg:sticky lg:top-24">
              <p className="eyebrow">{listing.category_name ?? 'Listing'}</p>
              <h1 className="font-display mt-3 text-3xl leading-tight tracking-tight sm:text-[2.5rem]">
                {listing.title_en}
              </h1>
              <p className="tnum mt-4 text-3xl font-semibold tracking-tight">{priceLabel}</p>

              <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-y border-border py-6">
                <Spec label="Condition" value={conditionLabel(listing.condition)} />
                <Spec label="Pricing" value={listing.is_negotiable ? 'Negotiable' : 'Fixed'} />
                <Spec label="Location" value={location || null} />
                <Spec label="Listed" value={postedLabel} />
              </dl>

              {!isOwner && (
                <div className="mt-7 flex gap-3">
                  <div className="flex-1">
                    <ContactSellerButton listingId={listing.id} authed={!!user} />
                  </div>
                  <FavoriteButton
                    listingId={listing.id}
                    initialFavorited={favorited}
                    authed={!!user}
                    className="size-11 shrink-0 rounded-full border border-border bg-card hover:bg-accent"
                  />
                </div>
              )}

              {seller && (
                <div className="mt-7">
                  <SellerTrustCard seller={seller} />
                  <div className="mt-3 rounded-xl border border-border bg-card p-4">
                    <SellerReputation rep={sellerRep} />
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-xl border border-border bg-accent/40 p-4">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <ShieldCheckIcon className="size-4 text-primary" />
                  Buyer safety
                </p>
                <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                  <li>Meet in a public place during daylight.</li>
                  <li>Inspect the item thoroughly before paying.</li>
                  <li>Never transfer money in advance or off-platform.</li>
                </ul>
              </div>

              {!isOwner && (
                <div className="mt-5 flex items-center justify-center gap-1 text-muted-foreground">
                  <ReportButton
                    target="listing"
                    listingId={listing.id}
                    reportedUserId={listing.seller_id}
                    authed={!!user}
                  />
                  <span className="text-border">·</span>
                  <ReportButton
                    target="user"
                    reportedUserId={listing.seller_id}
                    authed={!!user}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Description — after the details on mobile; bottom-left (row 2) on lg. */}
          <section className="border-t border-border pt-8 lg:col-span-7 lg:col-start-1 lg:row-start-2">
            <p className="eyebrow">Description</p>
            <p className="mt-4 whitespace-pre-line text-[15px] leading-[1.75] text-foreground/90">
              {/* Legacy listings may contain contact details entered before
                  enforcement — masked at display until the owner edits. */}
              {maskContactInfo(listing.description)}
            </p>
          </section>
        </div>

        {related.length > 0 && (
          <section className="mt-14 border-t border-border pt-10 sm:mt-20">
            <p className="eyebrow mb-6">More from this seller</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-4 sm:gap-x-6">
              {related.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  favorited={relatedFav.has(l.id)}
                  authed={!!user}
                />
              ))}
            </div>
          </section>
        )}

        {similar.length > 0 && (
          <section className="mt-14 border-t border-border pt-10 sm:mt-20">
            <p className="eyebrow mb-6">You may also like</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-4 sm:gap-x-6">
              {similar.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  favorited={similarFav.has(l.id)}
                  authed={!!user}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {!isOwner && (
        <StickyContactBar listingId={listing.id} authed={!!user} priceLabel={priceLabel} />
      )}
    </>
  )
}
