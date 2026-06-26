import Link from 'next/link'
import Image from 'next/image'
import { BadgeCheckIcon, ImageIcon, MapPinIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/components/profile/ProfileHeader'
import { FavoriteButton } from '@/components/listing/FavoriteButton'
import { formatPrice, formatRelativeTime } from '@/lib/format'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
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
    <Link href={`/listing/${listing.id}`} className="lift group block focus-visible:outline-none">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted shadow-soft transition-shadow duration-300 group-hover:shadow-float group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2">
        {listing.cover_key ? (
          <Image
            src={publicUrl(LISTING_IMAGES_BUCKET, listing.cover_key)}
            alt={listing.title_en}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 360px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-8 opacity-30" />
          </div>
        )}

        {/* legibility gradient for the location chip */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />

        {/* top row: badges + favorite */}
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-emerald-900 shadow-sm backdrop-blur">
                <BadgeCheckIcon className="size-3.5 text-gold" />
                Verified
              </span>
            )}
            {condition && (
              <span className="rounded-full bg-white/85 px-2 py-1 text-[11px] font-medium text-neutral-800 shadow-sm backdrop-blur">
                {condition}
              </span>
            )}
          </div>
          <FavoriteButton
            listingId={listing.id}
            initialFavorited={favorited}
            authed={authed}
            className="size-9 rounded-full bg-white/90 text-neutral-900 shadow-sm backdrop-blur transition hover:bg-white"
          />
        </div>

        {/* bottom-left location chip on the gradient */}
        {location && (
          <p className="absolute inset-x-3 bottom-3 flex items-center gap-1 text-xs font-medium text-white">
            <MapPinIcon className="size-3.5 shrink-0" />
            <span className="truncate">{location}</span>
          </p>
        )}
      </div>

      <div className="px-1 pt-3.5">
        <h3 className="font-display line-clamp-1 text-[17px] leading-snug">{listing.title_en}</h3>

        <div className="mt-1.5 flex items-end justify-between gap-2">
          <p className="tnum text-lg font-bold tracking-tight">
            {formatPrice(listing.price_fils, listing.currency)}
          </p>
          {posted && <span className="shrink-0 text-xs text-muted-foreground">{posted}</span>}
        </div>

        {seller && (
          <div className="mt-2.5 flex items-center gap-2 border-t border-border pt-2.5">
            <Avatar className="size-6">
              <AvatarImage src={seller.avatar_url ?? undefined} alt={seller.display_name} />
              <AvatarFallback className="text-[10px]">
                {initials(seller.display_name)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {seller.display_name}
            </span>
            {verified && <BadgeCheckIcon className="size-3.5 shrink-0 text-gold" />}
          </div>
        )}
      </div>
    </Link>
  )
}
