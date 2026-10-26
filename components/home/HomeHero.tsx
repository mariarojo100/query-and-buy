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
import type { FeedListing, CategoryLite } from '@/lib/listings/queries'

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

/** One cell of the inventory wall — a real photo doing the work. */
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
        'group animate-rise relative overflow-hidden rounded-xl border border-border/80 bg-muted shadow-soft transition-shadow duration-300 hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
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
  categories = [],
  favoritedIds,
  authed = false,
}: {
  trending: string[]
  listings: FeedListing[]
  categories?: CategoryLite[]
  favoritedIds?: Set<string>
  authed?: boolean
}) {
  const wall = listings.slice(0, 7)
  const quickCategories = categories
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.position - b.position)
    .slice(0, 6)

  return (
    <section className="pt-6 sm:pt-8">
      {/* ---------- Pine hero panel — search-forward, the marketplace front door ---------- */}
      <div className="animate-rise relative overflow-hidden rounded-[1.25rem] bg-[oklch(0.25_0.045_160)] px-6 py-16 shadow-float sm:rounded-[1.75rem] sm:px-12 sm:py-24">
        {/* Depth — a diagonal pine gradient plus a soft glow that lifts the centre. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[oklch(0.34_0.055_163)] via-[oklch(0.26_0.05_160)] to-[oklch(0.19_0.04_158)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-6rem] h-[28rem] w-[46rem] max-w-[130%] -translate-x-1/2 rounded-full bg-[oklch(0.58_0.09_162)] opacity-[0.18] blur-[90px]"
        />
        {/* Quiet magnifier-arc motifs — a brand echo, balanced corner to corner. */}
        <svg
          aria-hidden
          viewBox="0 0 200 200"
          className="pointer-events-none absolute -right-10 -top-16 h-80 w-80 text-white/[0.07] sm:-right-6 sm:h-[26rem] sm:w-[26rem]"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
        >
          <circle cx={108} cy={92} r={60} />
          <circle cx={108} cy={92} r={46} strokeWidth={1.5} />
          <path d="M64 136 L30 170" strokeWidth={12} strokeLinecap="round" />
        </svg>
        <svg
          aria-hidden
          viewBox="0 0 200 200"
          className="pointer-events-none absolute -bottom-24 -left-16 hidden h-72 w-72 text-white/[0.05] sm:block"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
        >
          <circle cx={92} cy={108} r={56} />
          <path d="M132 148 L168 184" strokeWidth={11} strokeLinecap="round" />
        </svg>

        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="display-hero text-balance text-[oklch(0.975_0.014_95)]">
            Buy and sell across the Emirates.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-[oklch(0.97_0.012_95)]/75 sm:text-lg">
            The UAE&rsquo;s marketplace for quality pre-owned — thousands of finds from verified
            sellers, listed in minutes and sold safely.
          </p>

          <div className="relative mx-auto mt-9 max-w-2xl text-left">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-6 -inset-y-4 rounded-full bg-[oklch(0.6_0.08_162)] opacity-25 blur-2xl"
            />
            <div className="relative">
              <SmartSearchBox trending={trending} />
            </div>
          </div>

          {quickCategories.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {quickCategories.map((c) => (
                <Link
                  key={c.id}
                  href={`/${c.slug}`}
                  className="inline-flex items-center rounded-full border border-white/25 px-4 py-1.5 text-sm text-[oklch(0.97_0.012_95)]/90 transition hover:border-white/50 hover:bg-white/10"
                >
                  {c.name_en}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[oklch(0.97_0.012_95)]/65">
            <span className="inline-flex items-center gap-1.5">
              <TagIcon className="size-4" strokeWidth={1.75} />
              Free to list
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheckIcon className="size-4" strokeWidth={1.75} />
              Verified sellers
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPinIcon className="size-4" strokeWidth={1.75} />
              All 7 emirates
            </span>
          </div>
        </div>
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
