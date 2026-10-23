import Link from 'next/link'
import { ArrowRightIcon, CameraIcon } from 'lucide-react'
import { SmartSearchBox } from '@/components/search/SmartSearchBox'
import { FeaturedShowcase } from '@/components/home/FeaturedShowcase'
import { LocationMenu } from '@/components/layout/LocationMenu'
import type { FeedListing } from '@/lib/listings/queries'

const POPULAR = ['iPhone', 'Toyota', 'PlayStation 5', 'Apartment in Dubai', 'Rolex']

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
  return (
    <section className="pt-5 sm:pt-8">
      {/* Band — the pitch and the search (the primary CTA) */}
      <div className="grid items-end gap-6 lg:grid-cols-[1.12fr_0.88fr] lg:gap-10">
        <div className="animate-rise min-w-0">
          <h1 className="display-md">
            Find it. Buy it.
            <br />
            Love it.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            Thousands of quality pre-owned finds across the Emirates — listed in minutes, priced
            fairly, sold safely.
          </p>
        </div>

        <div className="animate-rise min-w-0">
          <SmartSearchBox trending={trending} />
          <Link
            href="/sell"
            className="lift group mt-3 flex items-center gap-3.5 rounded-2xl border border-border bg-card p-3.5 shadow-soft ring-gold hover:border-gold/40"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/12 text-gold ring-1 ring-inset ring-gold/25">
              <CameraIcon className="size-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">List in 2 minutes from a photo</p>
              <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                Snap it — we draft the title, details and a fair price.
              </p>
            </div>
            <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition group-hover:text-gold" />
          </Link>
        </div>
      </div>

      {/* Trending row */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="eyebrow mr-1">Trending</span>
        {POPULAR.map((q) => (
          <Link
            key={q}
            href={`/?q=${encodeURIComponent(q)}`}
            className="inline-flex items-center rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground shadow-soft transition hover:border-gold/40 hover:bg-accent/40 hover:text-foreground"
          >
            {q}
          </Link>
        ))}
      </div>

      {/* Featured — imagery-led bento of real listings */}
      {listings.length > 0 && (
        <div className="mt-8 sm:mt-10">
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
