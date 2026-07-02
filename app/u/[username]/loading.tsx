import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <>
      <div className="h-16 border-b border-border" />
      <main className="mx-auto w-full max-w-5xl px-5 pb-12 sm:px-8">
        <Skeleton className="mt-2 h-40 w-full rounded-3xl sm:h-56" />
        <div className="-mt-14 flex items-end gap-5 px-1 sm:-mt-16">
          <Skeleton className="size-28 rounded-full sm:size-32" />
          <div className="space-y-2 pb-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[92px] rounded-2xl" />
          ))}
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
          ))}
        </div>
      </main>
    </>
  )
}
