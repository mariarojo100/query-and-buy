import Link from 'next/link'
import { TrendingUpIcon } from 'lucide-react'
import { ListingCard } from '@/components/listing/ListingCard'
import type { FeedListing } from '@/lib/listings/queries'

/** "Trending today" — a horizontal rail of real product cards. */
export function TrendingRail({
  listings,
  favoritedIds,
  authed = false,
  viewAllHref = '/?sort=most_viewed',
}: {
  listings: FeedListing[]
  favoritedIds?: Set<string>
  authed?: boolean
  viewAllHref?: string
}) {
  if (listings.length === 0) return null

  return (
    <section className="py-6 sm:py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-2xl tracking-tight sm:text-3xl">Trending today</h2>
          <TrendingUpIcon className="size-5 text-gold" />
        </div>
        <Link
          href={viewAllHref}
          className="shrink-0 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground shadow-soft transition hover:border-gold/40 hover:text-gold"
        >
          View all
        </Link>
      </div>

      {/* Edge-to-edge horizontal scroll; the negative margin lets cards bleed to the viewport edge. */}
      <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden">
        {listings.map((l) => (
          <div key={l.id} className="w-[15rem] shrink-0 snap-start sm:w-[16rem]">
            <ListingCard listing={l} favorited={favoritedIds?.has(l.id) ?? false} authed={authed} />
          </div>
        ))}
      </div>
    </section>
  )
}
