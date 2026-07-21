import Link from 'next/link'
import { CompassIcon, SearchXIcon } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { ListingCard } from '@/components/listing/ListingCard'
import type { FeedListing } from '@/lib/listings/queries'

export function ListingResults({
  listings,
  count,
  favoritedIds,
  authed = false,
  query,
  resetHref,
}: {
  listings: FeedListing[]
  count: number
  favoritedIds?: Set<string>
  authed?: boolean
  /** The active search term — makes the empty state name what was searched. */
  query?: string
  /** When set, the empty state offers a one-tap way back to the full marketplace. */
  resetHref?: string
}) {
  const searching = Boolean(resetHref)
  const q = query?.trim()

  return (
    <div>
      <p className="eyebrow mb-5">
        {count} {count === 1 ? 'listing' : 'listings'}
      </p>

      {listings.length === 0 ? (
        <EmptyState
          icon={SearchXIcon}
          title={searching ? (q ? `No results for “${q}”` : 'No matches') : 'Nothing here yet'}
          description={
            searching
              ? 'Nothing matched your search and filters. Try broadening them, or browse the whole marketplace.'
              : 'New listings show up here as sellers post them across the Emirates.'
          }
          action={
            searching ? (
              <Button asChild className="rounded-full px-5">
                <Link href={resetHref!}>
                  <CompassIcon className="size-4" />
                  Browse everything
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3">
          {listings.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              favorited={favoritedIds?.has(l.id) ?? false}
              authed={authed}
            />
          ))}
        </div>
      )}
    </div>
  )
}
