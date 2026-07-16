import Link from 'next/link'
import { SparklesIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SmartSearchBox } from '@/components/search/SmartSearchBox'
import { SafeListingImage } from '@/components/listing/SafeListingImage'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import { formatPrice, formatRelativeTime } from '@/lib/format'
import { emirateLabel } from '@/lib/profile/emirates'
import type { FeedListing } from '@/lib/listings/queries'

const POPULAR = ['iPhone', 'Toyota', 'PlayStation 5', 'Apartment in Dubai', 'Rolex']

/** A small product card used as a floating preview inside the hero collage. */
function PreviewCard({
  listing,
  className,
  style,
}: {
  listing: FeedListing
  className?: string
  style?: React.CSSProperties
}) {
  const location = emirateLabel(listing.emirate)
  const posted = formatRelativeTime(listing.published_at)
  return (
    <Link
      href={`/listing/${listing.id}`}
      style={style}
      className={cn(
        'block overflow-hidden rounded-2xl border border-border bg-card shadow-float transition duration-300 hover:-translate-y-1',
        className,
      )}
    >
      <div className="relative aspect-[4/3] bg-muted">
        {listing.cover_key ? (
          <SafeListingImage
            src={publicUrl(LISTING_IMAGES_BUCKET, listing.cover_key)}
            alt={listing.title_en}
            sizes="240px"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-accent via-muted to-secondary/70">
            <span className="font-display text-2xl text-primary/40">Q&amp;B</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-display line-clamp-1 text-[13px] leading-snug text-foreground/80">
          {listing.title_en}
        </p>
        <p className="tnum mt-1 text-sm font-semibold tracking-tight">
          {formatPrice(listing.price_fils, listing.currency)}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {[location, posted].filter(Boolean).join(' · ')}
        </p>
      </div>
    </Link>
  )
}

export function HomeHero({
  trending,
  previews,
}: {
  trending: string[]
  previews: FeedListing[]
}) {
  const [a, b, c] = previews

  return (
    <section className="animate-rise grid items-center gap-10 pb-8 pt-6 sm:pt-8 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pb-12 lg:pt-12">
      {/* Left — the pitch + search */}
      <div>
        <p className="eyebrow text-gold">AI Marketplace · United Arab Emirates</p>
        <h1 className="font-display mt-4 text-[2.6rem] leading-[0.98] tracking-tight sm:text-[3.75rem]">
          Find it. Buy it.
          <br />
          <span className="text-gold">Love it.</span>
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
          The smarter way to buy and sell used items across the UAE.
        </p>

        <div className="mt-6 max-w-xl">
          <SmartSearchBox trending={trending} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1">Popular</span>
          {POPULAR.map((q) => (
            <Link
              key={q}
              href={`/?q=${encodeURIComponent(q)}`}
              className="inline-flex items-center rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground shadow-soft transition hover:border-gold/40 hover:bg-accent/40 hover:text-foreground"
            >
              {q}
            </Link>
          ))}
          <Link
            href="/?sort=newest"
            className="inline-flex items-center rounded-full px-2.5 py-1.5 text-sm font-medium text-foreground transition hover:text-gold"
          >
            More →
          </Link>
        </div>
      </div>

      {/* Right — AI-search collage of real listings (desktop only) */}
      {a && (
        <div className="relative hidden h-[400px] lg:block" aria-hidden="true">
          {/* caption + arrow */}
          <div className="absolute left-0 top-14 z-40 w-40">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
              <SparklesIcon className="size-3.5" />
              AI Search
            </span>
            <p className="font-display mt-3 text-xl leading-snug tracking-tight">
              Find exactly what you want in seconds.
            </p>
            <svg
              className="mt-2 h-10 w-28 text-gold/50"
              viewBox="0 0 120 44"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M2 6 C 40 4, 92 12, 112 38" strokeDasharray="1 6" />
              <path d="M104 30 L114 39 L102 42" />
            </svg>
          </div>

          {/* collage — front card upright, two peeking behind */}
          {c && (
            <PreviewCard
              listing={c}
              className="absolute right-0 top-0 w-44 rotate-[4deg] opacity-95"
              style={{ zIndex: 10 }}
            />
          )}
          {b && (
            <PreviewCard
              listing={b}
              className="absolute right-24 top-24 w-48 -rotate-[5deg]"
              style={{ zIndex: 20 }}
            />
          )}
          <PreviewCard
            listing={a}
            className="absolute bottom-0 right-16 w-56"
            style={{ zIndex: 30 }}
          />
        </div>
      )}
    </section>
  )
}
