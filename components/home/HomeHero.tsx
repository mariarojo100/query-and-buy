import Link from 'next/link'
import { ArrowRightIcon, MapPinIcon, ShieldCheckIcon, TagIcon } from 'lucide-react'
import { SmartSearchBox } from '@/components/search/SmartSearchBox'
import { SafeListingImage } from '@/components/listing/SafeListingImage'
import { FavoriteButton } from '@/components/listing/FavoriteButton'
import { LocationMenu } from '@/components/layout/LocationMenu'
import { formatPrice } from '@/lib/format'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import { BLUR_DATA_URL } from '@/lib/blur'
import { emirateLabel } from '@/lib/profile/emirates'
import { conditionLabel } from '@/lib/listings/conditions'
import { listingPath } from '@/lib/listings/slug'
import { cn } from '@/lib/utils'
import type { FeedListing } from '@/lib/listings/queries'

/** Editorial tiling for the inventory wall: a big lead cell, two wide banners,
 *  the rest square — so it reads curated, not like a uniform generated grid.
 *  Index 0 is the lead; the pattern tiles a 4-col × 3-row desktop grid cleanly. */
const WALL_SPAN: string[] = [
  'col-span-2 row-span-2 aspect-square lg:aspect-auto', // 0 — lead
  'aspect-[4/5] lg:aspect-auto', //                        1
  'aspect-[4/5] lg:aspect-auto', //                        2
  'col-span-2 aspect-[16/10] lg:row-span-1 lg:aspect-auto', // 3 — wide
  'aspect-[4/5] lg:aspect-auto', //                        4
  'aspect-[4/5] lg:aspect-auto', //                        5
  'col-span-2 aspect-[16/10] lg:row-span-1 lg:aspect-auto', // 6 — wide
]

function priceClass(lead: boolean) {
  return cn(
    'tnum font-bold leading-none tracking-tight text-white drop-shadow',
    lead ? 'text-2xl sm:text-3xl' : 'text-lg',
  )
}

/** One cell of the inventory wall — a real photo doing the work, with price,
 *  title and location set over a legibility scrim. */
function WallCard({
  listing,
  index,
  favorited,
  authed,
}: {
  listing: FeedListing
  index: number
  favorited: boolean
  authed: boolean
}) {
  const lead = index === 0
  const location = [listing.area, emirateLabel(listing.emirate)].filter(Boolean).join(', ')
  const condition = conditionLabel(listing.condition)
  return (
    <Link
      href={listingPath(listing.title_en, listing.public_id)}
      style={{ animationDelay: `${Math.min(index, 6) * 55}ms` }}
      className={cn(
        'group animate-rise relative overflow-hidden rounded-2xl bg-muted shadow-soft ring-1 ring-inset ring-foreground/[0.06] transition-shadow duration-300 hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
        WALL_SPAN[index] ?? 'aspect-[4/5] lg:aspect-auto',
      )}
    >
      {listing.cover_key ? (
        <SafeListingImage
          src={publicUrl(LISTING_IMAGES_BUCKET, listing.cover_key)}
          alt={[listing.title_en, condition, location].filter(Boolean).join(' – ')}
          sizes={lead ? '(max-width: 1024px) 100vw, 45vw' : '(max-width: 1024px) 50vw, 24vw'}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]"
        />
      ) : (
        <span className="flex size-full items-center justify-center bg-gradient-to-br from-accent via-muted to-secondary/70">
          <span className="font-display select-none text-4xl text-primary/25">Q&amp;B</span>
        </span>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

      <div className="absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2">
        <div className="flex flex-col items-start gap-1.5">
          {listing.is_featured && (
            <span className="rounded-md bg-gold px-2 py-1 text-[11px] font-semibold text-gold-foreground shadow-sm">
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
          listingId={listing.id}
          initialFavorited={favorited}
          authed={authed}
          className="size-9 rounded-full bg-white/90 text-neutral-800 shadow-sm transition hover:bg-white"
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 text-white">
        <p className={priceClass(lead)}>{formatPrice(listing.price_fils, listing.currency)}</p>
        <h3 className={cn('mt-1.5 line-clamp-1 font-medium text-white/95', lead ? 'text-base sm:text-lg' : 'text-[13px]')}>
          {listing.title_en}
        </h3>
        {location && (
          <p className="mt-1 flex items-center gap-1 text-xs text-white/70">
            <MapPinIcon className="size-3.5 shrink-0" />
            <span className="truncate">{location}</span>
          </p>
        )}
      </div>
    </Link>
  )
}

export function HomeHero({
  trending,
  listings,
  favoritedIds,
  authed = false,
}: {
  trending: string[]
  listings: FeedListing[]
  favoritedIds?: Set<string>
  authed?: boolean
}) {
  const cover = listings[0]
  // The wall leads with the next item and runs the editorial tiling (up to 7).
  const wall = listings.slice(1, 8)

  return (
    <section className="pt-6 sm:pt-10">
      {/* ---------- Masthead: one headline, one action, one honest line ---------- */}
      <div className="animate-rise grid items-center gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
        <div>
          <p className="inline-flex items-center gap-2.5 text-sm font-medium text-gold">
            <span className="h-px w-7 bg-gold/60" aria-hidden />
            The UAE&rsquo;s marketplace for pre-owned
          </p>
          <h1 className="display-hero mt-5 max-w-[15ch] text-balance text-foreground">
            Buy and sell almost anything.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            Thousands of quality finds across all seven emirates — listed in minutes,
            priced fairly, sold safely.
          </p>

          <div className="mt-7 max-w-xl">
            <SmartSearchBox trending={trending} />
          </div>

          {/* Honest, non-numeric reassurance — one tight line, no chip clutter. */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <TagIcon className="size-4 text-gold" strokeWidth={1.75} />
              Free to list
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheckIcon className="size-4 text-gold" strokeWidth={1.75} />
              Verified sellers
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPinIcon className="size-4 text-gold" strokeWidth={1.75} />
              All 7 emirates
            </span>
          </div>
        </div>

        {/* ---------- One editorial cover — a single strong image, not a cluster ---------- */}
        {cover && (
          <Link
            href={listingPath(cover.title_en, cover.public_id)}
            className="group relative hidden h-[30rem] overflow-hidden rounded-3xl bg-muted shadow-float ring-1 ring-inset ring-foreground/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold lg:block"
          >
            {cover.cover_key ? (
              <SafeListingImage
                src={publicUrl(LISTING_IMAGES_BUCKET, cover.cover_key)}
                alt={cover.title_en}
                sizes="45vw"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
              />
            ) : (
              <span className="flex size-full items-center justify-center bg-gradient-to-br from-accent via-muted to-secondary/70">
                <span className="font-display text-5xl text-primary/25">Q&amp;B</span>
              </span>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-white">
              <div className="min-w-0">
                <p className="tnum text-3xl font-bold leading-none tracking-tight drop-shadow">
                  {formatPrice(cover.price_fils, cover.currency)}
                </p>
                <h3 className="mt-2 line-clamp-1 text-lg font-medium text-white/95">{cover.title_en}</h3>
                <p className="mt-1 flex items-center gap-1 text-sm text-white/70">
                  <MapPinIcon className="size-4 shrink-0" />
                  {[cover.area, emirateLabel(cover.emirate)].filter(Boolean).join(', ') || 'United Arab Emirates'}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm transition group-hover:bg-white">
                View
              </span>
            </div>
          </Link>
        )}
      </div>

      {/* ---------- Inventory wall — the marketplace's real energy, high on the page ---------- */}
      {wall.length > 0 && (
        <div className="mt-12 sm:mt-16">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="display-md text-foreground">Fresh near you</h2>
              <LocationMenu variant="inline" />
            </div>
            <Link
              href="/?sort=most_viewed"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-foreground transition hover:text-gold"
            >
              View all
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:h-[44rem] lg:grid-cols-4 lg:grid-rows-3">
            {wall.map((l, i) => (
              <WallCard
                key={l.id}
                listing={l}
                index={i}
                favorited={favoritedIds?.has(l.id) ?? false}
                authed={authed}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
