import Link from 'next/link'
import { PackageIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { PremiumListingCard } from '@/components/account/PremiumListingCard'
import { getMyListings } from '@/lib/listings/queries'
import { cn } from '@/lib/utils'

export const metadata = { title: 'My listings · Query & Buy' }

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'sold', label: 'Sold' },
  { key: 'draft', label: 'Paused' },
]

export default async function SellerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const sp = await searchParams
  const filter = sp.status ?? 'all'
  const all = await getMyListings()
  const listings = filter === 'all' ? all : all.filter((l) => l.status === filter)

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl tracking-tight">
          {filter === 'sold' ? 'Sold items' : filter === 'draft' ? 'Paused listings' : 'My listings'}
        </h2>
        <Button asChild size="sm" className="rounded-full">
          <Link href="/sell">
            <PlusIcon className="size-4" />
            <span className="hidden sm:inline">New listing</span>
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === 'all' ? '/account/listings' : `/account/listings?status=${f.key}`}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm transition',
              filter === f.key
                ? 'border-transparent bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {f.label}
            {f.key !== 'all' && (
              <span className="ml-1.5 tnum opacity-70">
                {all.filter((l) => l.status === f.key).length}
              </span>
            )}
          </Link>
        ))}
      </div>

      {listings.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title={filter === 'all' ? 'Sell your first item' : 'Nothing here yet'}
          description={
            filter === 'all'
              ? 'Snap a few photos and let AI write the title, description, and price. It takes about a minute.'
              : 'Listings in this state will appear here.'
          }
          action={
            <Button asChild className="rounded-full">
              <Link href="/sell">Start selling</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <PremiumListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </section>
  )
}
