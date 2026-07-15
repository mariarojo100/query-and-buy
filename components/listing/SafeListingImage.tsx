'use client'

import { useEffect, useRef, useState } from 'react'
import Image, { type ImageProps } from 'next/image'
import { cn } from '@/lib/utils'

/**
 * A listing image that degrades gracefully. If the source fails to load
 * (missing object, 404, network), it swaps to a branded, on-brand placeholder
 * instead of a bare grey box — so the marketplace still reads premium even when
 * imagery is sparse or an object is unavailable. `fill` only.
 *
 * We wrap the image in our own positioned span (the `fill` ancestor) so we can
 * read the underlying <img> directly. An image can error during SSR / before
 * hydration — in which case React's onError never fires — and next/image can
 * swap the <img> node on hydration, so a one-shot check misses it. A short
 * timer poll of the *current* node settles the moment the image completes.
 */
export function SafeListingImage({
  src,
  alt,
  className,
  ...rest
}: Omit<ImageProps, 'src' | 'fill'> & { src: string }) {
  const [failed, setFailed] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    setFailed(false)
    let timer: ReturnType<typeof setTimeout>
    let tries = 0
    const check = () => {
      const img = wrapRef.current?.querySelector('img')
      if (img?.complete) {
        if (img.naturalWidth === 0) setFailed(true)
        return
      }
      if (tries++ < 50) timer = setTimeout(check, 100) // ~5s window
    }
    check()
    return () => clearTimeout(timer)
  }, [src])

  if (failed) {
    return (
      <span
        aria-label={typeof alt === 'string' && alt ? alt : 'No photo available'}
        role="img"
        className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-accent via-muted to-secondary/70"
      >
        {/* Brand monogram — reads as intentional, never a broken-image glyph. */}
        <span className="font-display select-none text-3xl leading-none tracking-tight text-primary/40">
          Q&amp;B
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
          No photo
        </span>
      </span>
    )
  }

  return (
    <span ref={wrapRef} className="absolute inset-0 block">
      <Image
        src={src}
        alt={alt}
        fill
        className={cn(className)}
        onError={() => setFailed(true)}
        {...rest}
      />
    </span>
  )
}
