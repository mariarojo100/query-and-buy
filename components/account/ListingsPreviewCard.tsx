import Link from 'next/link'
import { PackageIcon, PlusIcon } from 'lucide-react'
import { CardHeading } from '@/components/account/CardHeading'
import { SafeListingImage } from '@/components/listing/SafeListingImage'
import { formatPrice } from '@/lib/format'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import type { FeedListing } from '@/lib/listings/queries'

export function ListingsPreviewCard({
  listings,
  activeCount,
}: {
  listings: FeedListing[]
  activeCount: number
}) {
  const empty = listings.length === 0
  return (
    <div className="flex h-full flex-col rounded-3xl border border-border bg-card p-5 shadow-soft">
      <CardHeading action={activeCount > 0 ? { label: 'See all', href: '/account/listings' } : undefined}>
        Listings
      </CardHeading>

      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <PackageIcon className="size-6" />
          </span>
          <div className="space-y-1">
            <p className="font-display text-base">No listings yet</p>
            <p className="mx-auto max-w-[22ch] text-xs leading-relaxed text-muted-foreground">
              You haven’t listed anything yet.
            </p>
          </div>
          <Link
            href="/sell"
            className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <PlusIcon className="size-4" /> List your first item
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {listings.slice(0, 3).map((l) => (
            <Link
              key={l.id}
              href={`/listing/${l.id}`}
              className="group flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-accent/60"
            >
              <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                {l.cover_key && (
                  <SafeListingImage
                    src={publicUrl(LISTING_IMAGES_BUCKET, l.cover_key)}
                    alt={l.title_en}
                    sizes="48px"
                    className="object-cover"
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground">{l.title_en}</span>
                <span className="tnum block text-xs text-muted-foreground">
                  {formatPrice(l.price_fils, l.currency)}
                </span>
              </span>
            </Link>
          ))}
          <Link
            href="/account/listings"
            className="block rounded-xl border border-border py-2 text-center text-xs font-medium text-primary transition-colors hover:bg-accent/60"
          >
            View all {activeCount} listings
          </Link>
        </div>
      )}
    </div>
  )
}
