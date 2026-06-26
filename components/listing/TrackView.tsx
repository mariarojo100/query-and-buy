'use client'

import { useEffect, useRef } from 'react'
import { recordView } from '@/app/listing/actions'

/** Fire-and-forget view tracking on the listing detail page (once per mount). */
export function TrackView({ listingId }: { listingId: string }) {
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    void recordView(listingId)
  }, [listingId])
  return null
}
