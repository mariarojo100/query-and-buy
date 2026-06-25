import Link from 'next/link'
import Image from 'next/image'
import { ImageIcon, MapPinIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/components/profile/ProfileHeader'
import { VerifiedBadge } from '@/components/profile/VerifiedBadge'
import { FavoriteButton } from '@/components/listing/FavoriteButton'
import { formatPrice } from '@/lib/format'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import { emirateLabel } from '@/lib/profile/emirates'
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

  return (
    <Link
      href={`/listing/${listing.id}`}
      className="group block overflow-hidden rounded-xl border bg-card transition hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-muted">
        {listing.cover_key ? (
          <Image
            src={publicUrl(LISTING_IMAGES_BUCKET, listing.cover_key)}
            alt={listing.title_en}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-8 opacity-40" />
          </div>
        )}
        <FavoriteButton
          listingId={listing.id}
          initialFavorited={favorited}
          authed={authed}
          className="absolute right-2 top-2 size-8 rounded-full bg-background/80 shadow-sm backdrop-blur hover:bg-background"
          iconClassName="size-4"
        />
      </div>

      <div className="space-y-2 p-3">
        <p className="text-lg font-semibold tracking-tight">
          {formatPrice(listing.price_fils, listing.currency)}
        </p>
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-foreground/90">
          {listing.title_en}
        </h3>

        {location && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPinIcon className="size-3.5" />
            {location}
          </p>
        )}

        {seller && (
          <div className="flex items-center gap-2 border-t pt-2">
            <Avatar className="size-6">
              <AvatarImage src={seller.avatar_url ?? undefined} alt={seller.display_name} />
              <AvatarFallback className="text-[10px]">
                {initials(seller.display_name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs text-muted-foreground">{seller.display_name}</span>
            <VerifiedBadge level={seller.badge_level} />
          </div>
        )}
      </div>
    </Link>
  )
}
