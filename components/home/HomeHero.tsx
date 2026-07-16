import Link from 'next/link'
import { ArrowRightIcon, SparklesIcon } from 'lucide-react'
import { SmartSearchBox } from '@/components/search/SmartSearchBox'
import { PopularNearYou } from '@/components/home/PopularNearYou'
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
    <section className="animate-rise grid items-center gap-10 pb-8 pt-6 sm:pt-8 lg:grid-cols-[1.02fr_1fr] lg:gap-12 lg:pb-12 lg:pt-12">
      {/* Left — the pitch, search, and AI listing cue */}
      <div className="min-w-0">
        <p className="eyebrow text-gold">UAE&rsquo;s Marketplace for Pre-Owned Items</p>
        <h1 className="font-display mt-4 text-[2.6rem] leading-[0.98] tracking-tight sm:text-[3.75rem]">
          Find it. Buy it.
          <br />
          <span className="text-gold">Love it.</span>
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
          Buy and sell quality pre-owned items across the UAE — safely and easily.
        </p>

        <div className="mt-6 max-w-xl">
          <SmartSearchBox trending={trending} />
        </div>

        {/* AI listing promo */}
        <Link
          href="/sell"
          className="group mt-4 flex max-w-xl items-center gap-4 rounded-2xl border border-violet-500/15 bg-violet-500/[0.06] p-4 transition hover:border-violet-500/30 hover:bg-violet-500/[0.09]"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/12 text-violet-600 ring-1 ring-inset ring-violet-500/20 dark:text-violet-400">
            <SparklesIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">AI Listing in 2 Minutes</p>
              <span className="rounded-full bg-violet-500/12 px-2 py-0.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400">
                New
              </span>
            </div>
            <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
              Upload photos, get item details, title and price suggestion — ready to list in just 2
              minutes.
            </p>
          </div>
          <span className="hidden shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-soft transition group-hover:border-gold/40 group-hover:text-gold sm:inline-flex">
            Try AI Listing
            <ArrowRightIcon className="size-4" />
          </span>
        </Link>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1">Popular searches</span>
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
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm font-medium text-foreground transition hover:text-gold"
          >
            More
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </div>

      {/* Right — real listings, "Popular near you" */}
      <PopularNearYou listings={listings} favoritedIds={favoritedIds} authed={authed} />
    </section>
  )
}
