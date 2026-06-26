import { SearchXIcon } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { ListingCard } from '@/components/listing/ListingCard'
import type { FeedListing } from '@/lib/listings/queries'

export function ListingResults({
  listings,
  count,
  favoritedIds,
  authed = false,
}: {
  listings: FeedListing[]
  count: number
  favoritedIds?: Set<string>
  authed?: boolean
}) {
  return (
    <div>
      <p className="eyebrow mb-5">
        {count} {count === 1 ? 'listing' : 'listings'}
      </p>

      {listings.length === 0 ? (
        <EmptyState
          icon={SearchXIcon}
          title="Nothing here yet"
          description="Try adjusting your search or filters — or clear them to see everything."
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
