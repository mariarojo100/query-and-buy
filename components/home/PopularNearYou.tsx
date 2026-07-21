'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'
import { ListingCard } from '@/components/listing/ListingCard'
import { LocationMenu } from '@/components/layout/LocationMenu'
import { cn } from '@/lib/utils'
import type { FeedListing } from '@/lib/listings/queries'

/**
 * The hero's right column: a compact, swipeable "Popular near you" rail showing
 * two real listings per page, with page dots. Uses native scroll-snap so it stays
 * smooth and keyboard/touch friendly.
 */
export function PopularNearYou({
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
  const trackRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)

  if (listings.length === 0) return null

  const pages = Math.ceil(listings.length / 2)

  function onScroll() {
    const el = trackRef.current
    if (!el) return
    setPage(Math.round(el.scrollLeft / el.clientWidth))
  }
  function goTo(i: number) {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="w-full min-w-0">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="font-display text-lg tracking-tight sm:text-xl">Popular near you</h2>
          <LocationMenu variant="inline" />
        </div>
        <Link
          href={viewAllHref}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-foreground transition hover:text-gold"
        >
          View all
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>

      {/* Two cards per page; each page snaps to the container width. */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {listings.map((l) => (
          <div key={l.id} className="w-[calc(50%-0.5rem)] shrink-0 snap-start">
            <ListingCard listing={l} favorited={favoritedIds?.has(l.id) ?? false} authed={authed} />
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to page ${i + 1}`}
              aria-current={i === page}
              onClick={() => goTo(i)}
              className={cn(
                'h-2 rounded-full transition-all',
                i === page ? 'w-5 bg-gold' : 'w-2 bg-border hover:bg-muted-foreground/40',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
