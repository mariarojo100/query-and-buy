'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
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
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border bg-muted text-muted-foreground">
        <ImageIcon className="size-10 opacity-40" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-muted">
        <Image
          src={publicUrl(LISTING_IMAGES_BUCKET, keys[active])}
          alt={title}
          fill
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
