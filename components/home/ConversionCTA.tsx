import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SafeListingImage } from '@/components/listing/SafeListingImage'
import { formatPrice } from '@/lib/format'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import { cn } from '@/lib/utils'
import type { FeedListing } from '@/lib/listings/queries'

// Real listing cards float around the headline (framed tiles, gently tilted) to
// fill the band with inventory and energy. Shown only where there's gutter room.
const FLOAT_POS = [
  'left-[1%] top-[14%] w-36 -rotate-6',
  'right-[2%] top-[9%] w-32 rotate-[7deg]',
  'left-[7%] bottom-[12%] w-32 rotate-3',
  'right-[0%] bottom-[15%] w-40 -rotate-[7deg]',
]

function FloatCard({ listing, className }: { listing: FeedListing; className?: string }) {
  return (
    <div
      className={cn(
        'absolute hidden aspect-[4/5] overflow-hidden rounded-xl bg-muted shadow-float ring-1 ring-white/10 xl:block',
        className,
      )}
    >
      <SafeListingImage
        src={publicUrl(LISTING_IMAGES_BUCKET, listing.cover_key!)}
        alt=""
        sizes="12vw"
        className="object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
        <p className="tnum text-xs font-semibold text-white drop-shadow">
          {formatPrice(listing.price_fils, listing.currency)}
        </p>
      </div>
    </div>
  )
}

/**
 * The closing conversion moment — a cinematic emerald-to-black band with
 * luminous light and real inventory floating around the pitch. Pushes the two
 * actions the marketplace runs on: list something, or go find something.
 */
export function ConversionCTA({ listings = [] }: { listings?: FeedListing[] }) {
  const floats = listings.filter((l) => l.cover_key).slice(0, 4)

  return (
    <section className="py-10 sm:py-14">
      <div className="relative isolate overflow-hidden rounded-[1.25rem] px-6 py-20 shadow-float sm:rounded-[1.75rem] sm:px-12 sm:py-28">
        {/* Cinematic emerald → near-black canvas. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-20 bg-gradient-to-b from-[oklch(0.30_0.05_163)] via-[oklch(0.21_0.045_160)] to-[oklch(0.14_0.03_160)]"
        />
        {/* Luminous light for depth. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[38%] -z-10 h-[30rem] w-[42rem] max-w-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[oklch(0.64_0.13_162)] opacity-[0.22] blur-[110px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 right-[-8%] -z-10 h-80 w-80 rounded-full bg-[oklch(0.5_0.1_170)] opacity-20 blur-[90px]"
        />

        {/* Floating inventory (xl+ only, in the gutters). */}
        {floats.map((l, i) => (
          <FloatCard key={l.id} listing={l} className={cn('-z-10', FLOAT_POS[i])} />
        ))}

        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="display-md text-balance text-[oklch(0.975_0.014_95)] [text-shadow:0_2px_24px_oklch(0.1_0.03_158/0.5)]">
            Sell what you don&rsquo;t need. Find what you do.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-pretty text-[oklch(0.97_0.012_95)]/80 sm:text-lg">
            Free to list, quick to sell, safe to buy — with thousands of buyers and sellers across
            the Emirates.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-[oklch(0.985_0.004_106)] px-8 font-semibold text-[oklch(0.2_0.012_165)] hover:bg-white"
            >
              <Link href="/sell">
                Start selling
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-white/30 bg-transparent px-8 text-[oklch(0.97_0.012_95)] hover:border-white/55 hover:bg-white/10 hover:text-white"
            >
              <Link href="/?sort=newest">Browse the marketplace</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
