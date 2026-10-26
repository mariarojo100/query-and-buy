'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRightIcon, MapPinIcon } from 'lucide-react'
import { SafeListingImage } from '@/components/listing/SafeListingImage'
import { formatPrice } from '@/lib/format'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import { BLUR_DATA_URL } from '@/lib/blur'
import { emirateLabel } from '@/lib/profile/emirates'
import { listingPath } from '@/lib/listings/slug'
import { cn } from '@/lib/utils'
import type { FeedListing } from '@/lib/listings/queries'

const INTERVAL_MS = 4600

/**
 * Cinematic hero cover — a slow crossfade through the featured listings with a
 * gentle Ken Burns push. Real inventory doing the "wow", not decoration.
 * Pauses on hover; honours prefers-reduced-motion (static first listing).
 */
export function HeroCover({
  listings,
  className,
}: {
  listings: FeedListing[]
  className?: string
}) {
  const items = listings.filter((l) => l.cover_key).slice(0, 4)
  const [active, setActive] = useState(0)
  const [motion, setMotion] = useState(false)
  const hovering = useRef(false)

  // Only animate once we know motion is allowed (avoids SSR/hydration flash).
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setMotion(!mq.matches)
    const onChange = () => setMotion(!mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!motion || items.length < 2) return
    const id = setInterval(() => {
      if (!hovering.current) setActive((i) => (i + 1) % items.length)
    }, INTERVAL_MS)
    return () => clearInterval(id)
  }, [motion, items.length])

  if (items.length === 0) return null
  const current = items[active]
  const location =
    [current.area, emirateLabel(current.emirate)].filter(Boolean).join(', ') ||
    'United Arab Emirates'

  return (
    <div
      className={cn(
        'group relative h-[32rem] overflow-hidden rounded-xl border border-border/80 bg-muted shadow-soft',
        className,
      )}
      onMouseEnter={() => (hovering.current = true)}
      onMouseLeave={() => (hovering.current = false)}
    >
      {items.map((l, i) => (
        <div
          key={l.id}
          aria-hidden={i !== active}
          className={cn(
            'absolute inset-0 transition-opacity duration-[1100ms] ease-out',
            i === active ? 'opacity-100' : 'opacity-0',
          )}
        >
          <SafeListingImage
            src={publicUrl(LISTING_IMAGES_BUCKET, l.cover_key!)}
            alt={l.title_en}
            sizes="45vw"
            priority={i === 0}
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className={cn(
              'object-cover',
              motion && i === active && 'animate-kenburns',
            )}
          />
        </div>
      ))}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

      {/* Caption for the active listing — keyed so it re-fades on change. */}
      <Link
        key={current.id}
        href={listingPath(current.title_en, current.public_id)}
        className="animate-rise absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-6 text-white focus-visible:outline-none"
      >
        <div className="min-w-0">
          <p className="tnum text-[2rem] font-semibold leading-none tracking-tight drop-shadow">
            {formatPrice(current.price_fils, current.currency)}
          </p>
          <h3 className="mt-2.5 line-clamp-1 text-lg font-medium text-white/95">
            {current.title_en}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-white/70">
            <MapPinIcon className="size-4 shrink-0" />
            {location}
          </p>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/95 text-neutral-900 shadow-sm transition group-hover:bg-white">
          <ArrowUpRightIcon className="size-5" />
        </span>
      </Link>

      {/* Progress segments */}
      {items.length > 1 && (
        <div className="absolute inset-x-6 top-6 flex gap-1.5">
          {items.map((l, i) => (
            <button
              key={l.id}
              type="button"
              aria-label={`Show listing ${i + 1}`}
              onClick={() => setActive(i)}
              className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
            >
              <span
                className={cn(
                  'block h-full rounded-full bg-white transition-all duration-500',
                  i === active ? 'w-full' : 'w-0',
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
