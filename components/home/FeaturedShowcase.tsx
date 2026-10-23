import Link from 'next/link'
import { MapPinIcon } from 'lucide-react'
import { SafeListingImage } from '@/components/listing/SafeListingImage'
import { FavoriteButton } from '@/components/listing/FavoriteButton'
import { formatPrice } from '@/lib/format'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import { BLUR_DATA_URL } from '@/lib/blur'
import { emirateLabel } from '@/lib/profile/emirates'
import { conditionLabel } from '@/lib/listings/conditions'
import { listingPath } from '@/lib/listings/slug'
import { cn } from '@/lib/utils'
import type { FeedListing } from '@/lib/listings/queries'

/**
 * Imagery-led "bento" showcase — real product photos with the price/title set on
 * the image. One large hero cell + four supporting cells. The marketplace's
 * substance (real listings) is the visual.
 */
export function FeaturedShowcase({
  listings,
  favoritedIds,
  authed = false,
}: {
  listings: FeedListing[]
  favoritedIds?: Set<string>
  authed?: boolean
}) {
  const items = listings.slice(0, 5)
  if (items.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:h-[32rem] lg:grid-cols-4 lg:grid-rows-2">
      {items.map((l, i) => {
        const big = i === 0
        const location = [l.area, emirateLabel(l.emirate)].filter(Boolean).join(', ')
        const condition = conditionLabel(l.condition)
        return (
          <Link
            key={l.id}
            href={listingPath(l.title_en, l.public_id)}
            className={cn(
              'group relative overflow-hidden rounded-2xl bg-muted shadow-soft ring-1 ring-inset ring-foreground/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
              big
                ? 'col-span-2 row-span-2 aspect-square lg:aspect-auto'
                : 'aspect-[4/5] lg:aspect-auto',
            )}
          >
            {l.cover_key ? (
              <SafeListingImage
                src={publicUrl(LISTING_IMAGES_BUCKET, l.cover_key)}
                alt={[l.title_en, condition, location].filter(Boolean).join(' – ')}
                sizes={big ? '(max-width: 1024px) 100vw, 50vw' : '(max-width: 1024px) 50vw, 25vw'}
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]"
              />
            ) : (
              <span className="flex size-full items-center justify-center bg-gradient-to-br from-accent via-muted to-secondary/70">
                <span className="font-display select-none text-4xl tracking-tight text-primary/30">
                  Q&amp;B
                </span>
              </span>
            )}

            {/* Legibility scrim for the overlaid text */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

            <div className="absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2">
              <div className="flex flex-col items-start gap-1.5">
                {l.is_featured && (
                  <span className="rounded-md bg-gold px-2 py-1 text-[11px] font-medium text-gold-foreground shadow-sm">
                    Featured
                  </span>
                )}
                {condition && (
                  <span className="rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-neutral-800 shadow-sm">
                    {condition}
                  </span>
                )}
              </div>
              <FavoriteButton
                listingId={l.id}
                initialFavorited={favoritedIds?.has(l.id) ?? false}
                authed={authed}
                className="size-9 rounded-full bg-white/90 text-neutral-800 shadow-sm transition hover:bg-white"
              />
            </div>

            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 text-white">
              <p
                className={cn(
                  'tnum font-semibold leading-none tracking-tight drop-shadow',
                  big ? 'text-2xl sm:text-3xl' : 'text-lg',
                )}
              >
                {formatPrice(l.price_fils, l.currency)}
              </p>
              <h3
                className={cn(
                  'mt-1.5 line-clamp-1 font-medium text-white/95',
                  big ? 'text-base sm:text-lg' : 'text-[13px]',
                )}
              >
                {l.title_en}
              </h3>
              {location && (
                <p className="mt-1 flex items-center gap-1 text-xs text-white/75">
                  <MapPinIcon className="size-3.5 shrink-0" />
                  <span className="truncate">{location}</span>
                </p>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
