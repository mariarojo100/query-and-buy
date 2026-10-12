import Link from 'next/link'
import { ArrowRightIcon, CameraIcon } from 'lucide-react'
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
    <section className="grid items-center gap-10 pb-10 pt-5 sm:pt-9 lg:grid-cols-[1.06fr_1fr] lg:gap-14 lg:pb-16 lg:pt-12">
      {/* Left — the pitch, search, and list-from-photo cue */}
      <div className="animate-rise min-w-0">
        <div className="flex items-center gap-3">
          <span className="eyebrow text-gold">UAE&rsquo;s pre-owned marketplace</span>
          <span className="h-px flex-1 bg-border" aria-hidden />
        </div>

        <h1 className="display-hero mt-5 text-[clamp(3.25rem,8vw,5.75rem)]">
          Find it.
          <br />
          Buy it.
          <br />
          <span className="italic text-gold">Love it.</span>
        </h1>

        <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
          Thousands of quality pre-owned finds across the Emirates — listed in minutes, priced
          fairly, sold safely.
        </p>

        <div className="mt-7 max-w-xl">
          <SmartSearchBox trending={trending} />
        </div>

        {/* List-from-a-photo cue — on-brand, no generic "AI" chrome */}
        <Link
          href="/sell"
          className="lift group mt-4 flex max-w-xl items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft ring-gold hover:border-gold/40"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold/12 text-gold ring-1 ring-inset ring-gold/25">
            <CameraIcon className="size-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">List in 2 minutes from a photo</p>
              <span className="eyebrow rounded-full bg-gold/12 px-2 py-1 text-gold">New</span>
            </div>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
              Snap your item — we draft the title, details and a fair UAE price, ready to publish.
            </p>
          </div>
          <span className="hidden shrink-0 items-center gap-1 rounded-full border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition group-hover:border-gold/40 group-hover:text-gold sm:inline-flex">
            Try it
            <ArrowRightIcon className="size-4" />
          </span>
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2.5">
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
