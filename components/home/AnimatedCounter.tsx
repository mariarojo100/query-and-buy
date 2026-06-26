'use client'

import { useEffect, useRef, useState } from 'react'

/** Count-up animation on first view. Decorative micro-interaction. */
export function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [n, setN] = useState(0)
  const started = useRef(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started.current) {
          started.current = true
          const duration = 1100
          const start = performance.now()
          const tick = (t: number) => {
            const p = Math.min(1, (t - start) / duration)
            const eased = 1 - Math.pow(1 - p, 3)
            setN(Math.round(value * eased))
            if (p < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [value])

  return (
    <span ref={ref} className="tnum">
      {n.toLocaleString('en-AE')}
      {suffix}
    </span>
  )
}
