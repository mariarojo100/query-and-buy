import Link from 'next/link'
import { CompassIcon } from 'lucide-react'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-6 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-accent text-primary">
          <CompassIcon className="size-8" />
        </span>
        <p className="eyebrow mt-6">404 · Not found</p>
        <h1 className="font-display mt-2 text-3xl tracking-tight">This page wandered off</h1>
        <p className="mt-3 text-muted-foreground">
          The listing or page you&apos;re looking for may have been sold, removed, or never existed.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <Button asChild className="rounded-full">
            <Link href="/">Browse the marketplace</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/sell">Sell an item</Link>
          </Button>
        </div>
      </main>
    </>
  )
}
