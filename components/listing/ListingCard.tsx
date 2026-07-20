import Link from 'next/link'
import { BadgeCheckIcon, MapPinIcon, StarIcon } from 'lucide-react'
import { SafeListingImage } from '@/components/listing/SafeListingImage'
import { FavoriteButton } from '@/components/listing/FavoriteButton'
import { formatPrice, formatRelativeTime } from '@/lib/format'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import { BLUR_DATA_URL } from '@/lib/blur'
import { emirateLabel } from '@/lib/profile/emirates'
import { conditionLabel } from '@/lib/listings/conditions'
import type { FeedListing } from '@/lib/listings/queries'

export function ListingCard({
  listing,
  favorited = false,
  authed = false,
}: {
  listing: FeedListing
  favorited?: boolean
  authed?: boolean
}) {
  const { seller } = listing
  const location = [listing.area, emirateLabel(listing.emirate)].filter(Boolean).join(', ')
  const posted = formatRelativeTime(listing.published_at)
  const verified = seller?.email_verified
  const condition = conditionLabel(listing.condition)

  return (
    <Link
      href={`/listing/${listing.id}`}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
    >
      {/* Media — the photo does the work; a single condition signal, nothing else. */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted shadow-soft transition-shadow duration-300 group-hover:shadow-float">
        {listing.cover_key ? (
          <SafeListingImage
            src={publicUrl(LISTING_IMAGES_BUCKET, listing.cover_key)}
            alt={[listing.title_en, condition, location].filter(Boolean).join(' – ')}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 360px"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-accent via-muted to-secondary/70">
            <span className="font-display select-none text-3xl tracking-tight text-primary/40">
              Q&amp;B
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-foreground/[0.06]" />

        {/* top-left: at most one or two quiet signals */}
        <div className="absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2">
          <div className="flex flex-col items-start gap-1.5">
            {listing.is_featured && (
              <span className="inline-flex items-center gap-1 rounded-md bg-card/95 px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-gold shadow-sm backdrop-blur-sm">
                <StarIcon className="size-3 fill-gold" />
                Featured
              </span>
            )}
            {condition && (
              <span className="rounded-md bg-card/90 px-2 py-1 text-[11px] font-medium text-foreground/80 shadow-sm backdrop-blur-sm">
                {condition}
              </span>
            )}
          </div>
          <FavoriteButton
            listingId={listing.id}
            initialFavorited={favorited}
            authed={authed}
            className="size-9 rounded-full bg-card/90 text-foreground shadow-sm backdrop-blur-sm transition hover:bg-card"
          />
        </div>
      </div>

      {/* Info — price leads, title identifies, one quiet meta line carries place + trust. */}
      <div className="px-0.5 pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="tnum text-[17px] font-semibold tracking-tight text-foreground">
            {formatPrice(listing.price_fils, listing.currency)}
          </p>
          {posted && <span className="shrink-0 text-xs text-muted-foreground">{posted}</span>}
        </div>

        <h3 className="mt-1 line-clamp-1 text-sm leading-snug text-foreground/80">
          {listing.title_en}
        </h3>

        {(location || verified) && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            {location && (
              <>
                <MapPinIcon className="size-3.5 shrink-0" />
                <span className="truncate">{location}</span>
              </>
            )}
            {verified && (
              <span
                className="ml-auto inline-flex shrink-0 items-center gap-1 text-gold"
                title="Verified seller"
              >
                <BadgeCheckIcon className="size-3.5" />
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
