'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Refresh the current route on an interval while the tab is visible (Phase 6:
 * the target-stack replacement for Supabase Realtime). Polling pauses when the
 * tab is hidden and fires an immediate refresh when it becomes visible again,
 * so a returning user sees fresh data at once without burning cycles in the
 * background.
 */
export function usePollingRefresh(intervalMs: number): void {
  const router = useRouter()
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null

    const stop = () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }
    const start = () => {
      if (timer) return
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') router.refresh()
      }, intervalMs)
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        router.refresh()
        start()
      } else {
        stop()
      }
    }

    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [intervalMs, router])
}
