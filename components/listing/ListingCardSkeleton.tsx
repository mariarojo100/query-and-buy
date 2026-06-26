import { Skeleton } from '@/components/ui/skeleton'

/** Loading placeholder matching ListingCard's layout. */
export function ListingCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
      <div className="space-y-2 pt-3.5">
        <Skeleton className="h-2.5 w-28" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  )
}

export function ListingGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  )
}
