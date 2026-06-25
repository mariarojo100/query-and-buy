import { SearchXIcon } from 'lucide-react'
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
      <p className="mb-4 text-sm text-muted-foreground">
        {count} {count === 1 ? 'result' : 'results'}
      </p>

      {listings.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
          <SearchXIcon className="size-10 text-muted-foreground/40" />
          <p className="font-medium">No listings found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
