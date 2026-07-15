'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { ChevronLeftIcon, ChevronRightIcon, ExpandIcon, XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SafeListingImage } from '@/components/listing/SafeListingImage'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'

export function ImageGallery({ keys, title }: { keys: string[]; title: string }) {
  const [active, setActive] = useState(0)
  const [zoom, setZoom] = useState(false)
  const count = keys.length

  const go = useCallback(
    (dir: 1 | -1) => setActive((i) => (i + dir + count) % count),
    [count],
  )

  // Lightbox: lock scroll + wire keyboard while open.
  useEffect(() => {
    if (!zoom) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoom(false)
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [zoom, go])

  if (count === 0) {
    return (
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-muted">
        <div className="flex size-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-accent via-muted to-secondary/70">
          <span className="font-display select-none text-4xl leading-none tracking-tight text-primary/40">
            Q&amp;B
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
            No photo
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Main image — click to inspect fullscreen (condition matters for used goods). */}
      <button
        type="button"
        onClick={() => setZoom(true)}
        aria-label="View photo fullscreen"
        className="group relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-xl border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <SafeListingImage
          src={publicUrl(LISTING_IMAGES_BUCKET, keys[active])}
          alt={title}
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover"
          priority
        />
        <span className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-card/85 text-foreground opacity-0 shadow-sm backdrop-blur-sm transition group-hover:opacity-100">
          <ExpandIcon className="size-4" />
        </span>
        {count > 1 && (
          <span className="tnum absolute bottom-3 right-3 rounded-full bg-foreground/70 px-2.5 py-1 text-xs font-medium text-background backdrop-blur-sm">
            {active + 1} / {count}
          </span>
        )}
      </button>

      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {keys.map((key, i) => (
            <button
              key={key}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'relative aspect-square w-16 shrink-0 overflow-hidden rounded-lg border bg-muted transition',
                i === active
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                  : 'opacity-60 hover:opacity-100',
              )}
              aria-label={`View photo ${i + 1}`}
              aria-current={i === active}
            >
              <Image
                src={publicUrl(LISTING_IMAGES_BUCKET, key)}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} — photo ${active + 1} of ${count}`}
          onClick={() => setZoom(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/90 p-4 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150 sm:p-8"
        >
          <button
            type="button"
            onClick={() => setZoom(false)}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex size-11 items-center justify-center rounded-full bg-background/90 text-foreground shadow-float transition hover:bg-background"
          >
            <XIcon className="size-5" />
          </button>

          {count > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  go(-1)
                }}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-float transition hover:bg-background sm:left-6"
              >
                <ChevronLeftIcon className="size-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  go(1)
                }}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-float transition hover:bg-background sm:right-6"
              >
                <ChevronRightIcon className="size-5" />
              </button>
            </>
          )}

          <div
            className="relative h-[82vh] w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <SafeListingImage
              key={keys[active]}
              src={publicUrl(LISTING_IMAGES_BUCKET, keys[active])}
              alt={`${title} — photo ${active + 1}`}
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>

          {count > 1 && (
            <span className="tnum absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-background/90 px-3 py-1.5 text-sm font-medium text-foreground shadow-sm">
              {active + 1} / {count}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
