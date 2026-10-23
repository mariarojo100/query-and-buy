import Link from 'next/link'
import { ArrowRightIcon, MapPinIcon, ShieldCheckIcon, TagIcon } from 'lucide-react'
import { SmartSearchBox } from '@/components/search/SmartSearchBox'
import { FeaturedShowcase } from '@/components/home/FeaturedShowcase'
import { SafeListingImage } from '@/components/listing/SafeListingImage'
import { LocationMenu } from '@/components/layout/LocationMenu'
import { formatPrice } from '@/lib/format'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import { BLUR_DATA_URL } from '@/lib/blur'
import { emirateLabel } from '@/lib/profile/emirates'
import { listingPath } from '@/lib/listings/slug'
import { cn } from '@/lib/utils'
import type { FeedListing } from '@/lib/listings/queries'

const POPULAR = ['iPhone', 'Toyota', 'PlayStation 5', 'Apartment in Dubai', 'Rolex']

/** One image in the hero's editorial cluster — real photo + overlaid price. */
function ClusterCard({ listing, className }: { listing: FeedListing; className?: string }) {
  const location = [listing.area, emirateLabel(listing.emirate)].filter(Boolean).join(', ')
  return (
    <Link
      href={listingPath(listing.title_en, listing.public_id)}
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-muted shadow-float ring-1 ring-inset ring-foreground/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
        className,
      )}
    >
      {listing.cover_key ? (
        <SafeListingImage
          src={publicUrl(LISTING_IMAGES_BUCKET, listing.cover_key)}
          alt={listing.title_en}
          sizes="(max-width: 1024px) 50vw, 30vw"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]"
        />
      ) : (
        <span className="flex size-full items-center justify-center bg-gradient-to-br from-accent via-muted to-secondary/70">
          <span className="font-display text-3xl text-primary/30">Q&amp;B</span>
        </span>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3 text-white">
        <p className="tnum text-base font-semibold leading-none tracking-tight drop-shadow sm:text-lg">
          {formatPrice(listing.price_fils, listing.currency)}
        </p>
        <p className="mt-1 line-clamp-1 text-[12px] text-white/85">
          {listing.title_en}
          {location ? <span className="text-white/60"> · {location}</span> : null}
        </p>
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
  // The hero's imagery cluster uses the first three listings; the showcase
  // below browses the rest.
  const cluster = listings.slice(0, 3)
  const hasCluster = cluster.length === 3

  return (
    <section className="pt-5 sm:pt-8">
      <div className="animate-rise grid items-center gap-8 lg:grid-cols-[1.02fr_1.18fr] lg:gap-12">
        {/* ---------- Left: the pitch ---------- */}
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-gold">
            <span className="h-px w-6 bg-gold/60" aria-hidden />
            The UAE&rsquo;s marketplace for pre-owned
          </p>
          <h1 className="display-hero mt-4 text-foreground">
            Find it.
            <br />
            Buy it. Love it.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            Thousands of quality finds across the Emirates — listed in minutes, priced fairly,
            sold safely.
          </p>

          <div className="mt-7">
            <SmartSearchBox trending={trending} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {POPULAR.map((q) => (
              <Link
                key={q}
                href={`/?q=${encodeURIComponent(q)}`}
                className="inline-flex items-center rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-foreground/75 transition hover:border-gold/50 hover:text-foreground"
              >
                {q}
              </Link>
            ))}
          </div>

          {/* Honest, non-numeric proof — no fabricated counts. */}
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPinIcon className="size-4 text-gold" strokeWidth={1.75} />
              All 7 emirates
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheckIcon className="size-4 text-gold" strokeWidth={1.75} />
              Verified sellers
            </span>
            <span className="inline-flex items-center gap-1.5">
              <TagIcon className="size-4 text-gold" strokeWidth={1.75} />
              Free to list
            </span>
          </div>
        </div>

        {/* ---------- Right: editorial imagery cluster ---------- */}
        {hasCluster && (
          <div className="grid h-[20rem] grid-cols-2 gap-3 sm:h-[26rem] sm:gap-4 lg:h-[30rem]">
            <ClusterCard listing={cluster[0]} className="row-span-2" />
            <ClusterCard listing={cluster[1]} />
            <ClusterCard listing={cluster[2]} />
          </div>
        )}
      </div>

      {/* ---------- Featured — imagery-led bento of real listings ---------- */}
      {listings.length > 0 && (
        <div className="mt-12 sm:mt-16">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-xl tracking-tight sm:text-2xl">Featured near you</h2>
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
          <FeaturedShowcase listings={listings} favoritedIds={favoritedIds} authed={authed} />
        </div>
      )}
    </section>
  )
}
