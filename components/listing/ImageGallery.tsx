'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { SafeListingImage } from '@/components/listing/SafeListingImage'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'

export function ImageGallery({
  keys,
  title,
}: {
  keys: string[]
  title: string
}) {
  const [active, setActive] = useState(0)

  if (keys.length === 0) {
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
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-muted">
        <SafeListingImage
          src={publicUrl(LISTING_IMAGES_BUCKET, keys[active])}
          alt={title}
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover"
          priority
        />
      </div>

      {keys.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {keys.map((key, i) => (
            <button
              key={key}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'relative aspect-square w-16 shrink-0 overflow-hidden rounded-lg border bg-muted transition',
                i === active ? 'ring-2 ring-primary' : 'opacity-70 hover:opacity-100',
              )}
              aria-label={`View photo ${i + 1}`}
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
    </div>
  )
}
