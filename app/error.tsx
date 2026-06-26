'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { RotateCcwIcon, TriangleAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface to the browser console + any wired client logger. No sensitive data.
    console.error('[app:error]', { message: error.message, digest: error.digest })
  }, [error])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center border-b border-border px-5 sm:px-8">
        <Link href="/" className="font-display text-xl tracking-tight">
          Query <span className="text-muted-foreground">&amp;</span> Buy
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <TriangleAlertIcon className="size-8" />
        </span>
        <p className="eyebrow mt-6">Something went wrong</p>
        <h1 className="font-display mt-2 text-3xl tracking-tight">We hit a snag</h1>
        <p className="mt-3 text-muted-foreground">
          An unexpected error occurred. You can try again, or head back to the marketplace.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-muted-foreground">Reference: {error.digest}</p>
        )}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={reset} className="rounded-full">
            <RotateCcwIcon className="size-4" /> Try again
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/">Back to marketplace</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
