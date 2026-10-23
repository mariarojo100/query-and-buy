import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'
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
    <section className="pt-4 sm:pt-6">
      {/* Dark hero stage — high contrast, search-first */}
      <div className="animate-rise relative overflow-hidden rounded-[1.75rem] bg-primary px-6 py-12 text-center text-primary-foreground shadow-float sm:px-10 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-gold/18 blur-3xl sm:size-80"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-12 size-52 rounded-full bg-gold/10 blur-3xl sm:size-72"
        />
        <div className="relative mx-auto max-w-3xl">
          <p className="text-sm font-medium text-gold">The UAE&rsquo;s marketplace for pre-owned</p>
          <h1 className="display-hero mt-4 text-primary-foreground">Find it. Buy it. Love it.</h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-primary-foreground/70 sm:text-lg">
            Thousands of quality finds across the Emirates — listed in minutes, priced fairly, sold
            safely.
          </p>
          <div className="mx-auto mt-8 max-w-2xl text-left">
            <SmartSearchBox trending={trending} />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {POPULAR.map((q) => (
              <Link
                key={q}
                href={`/?q=${encodeURIComponent(q)}`}
                className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-sm text-primary-foreground/85 backdrop-blur-sm transition hover:border-gold/50 hover:bg-white/15 hover:text-primary-foreground"
              >
                {q}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Featured — imagery-led bento of real listings */}
      {listings.length > 0 && (
        <div className="mt-7 sm:mt-9">
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
