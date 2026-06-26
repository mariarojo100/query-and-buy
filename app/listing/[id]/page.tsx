import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeftIcon, PencilIcon, ShieldCheckIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
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
import { formatPrice } from '@/lib/format'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import { emirateLabel } from '@/lib/profile/emirates'
import { conditionLabel } from '@/lib/listings/conditions'
import { ListingCard } from '@/components/listing/ListingCard'
import { getListingById, getSellerListings } from '@/lib/listings/queries'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const listing = await getListingById(id)
  if (!listing) return { title: 'Listing not found · Query & Buy' }
  return {
    title: `${listing.title_en} · Query & Buy`,
    description: listing.description.slice(0, 150),
    openGraph: listing.images[0]
      ? { images: [publicUrl(LISTING_IMAGES_BUCKET, listing.images[0].storage_key)] }
      : undefined,
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
  const { id } = await params
  const listing = await getListingById(id)
  if (!listing) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isOwner = user?.id === listing.seller_id
  const favorited = (await getFavoritedIds([listing.id])).has(listing.id)

  const related = await getSellerListings(listing.seller_id, { excludeId: listing.id, limit: 4 })
  const relatedFav = await getFavoritedIds(related.map((l) => l.id))

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
              <Link href={`/listing/${id}/edit`}>
                <PencilIcon className="size-4" />
                Edit
              </Link>
            </Button>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Gallery */}
          <div className="lg:col-span-7">
            <ImageGallery keys={listing.images.map((i) => i.storage_key)} title={listing.title_en} />
          </div>

          {/* Details */}
          <div className="lg:col-span-5">
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
        </div>

        {/* Description */}
        <section className="mt-14 max-w-2xl border-t border-border pt-10 sm:mt-20">
          <p className="eyebrow">Description</p>
          <p className="mt-4 whitespace-pre-line text-[15px] leading-[1.75] text-foreground/90">
            {listing.description}
          </p>
        </section>

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
      </main>

      {!isOwner && (
        <StickyContactBar listingId={listing.id} authed={!!user} priceLabel={priceLabel} />
      )}
    </>
  )
}
