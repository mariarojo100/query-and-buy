import Link from 'next/link'
import { ShieldXIcon } from 'lucide-react'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { Button } from '@/components/ui/button'

export default function Forbidden() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-6 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldXIcon className="size-8" />
        </span>
        <p className="eyebrow mt-6">403 · Forbidden</p>
        <h1 className="font-display mt-2 text-3xl tracking-tight">Restricted area</h1>
        <p className="mt-3 text-muted-foreground">
          You don&apos;t have permission to view this page. The admin portal is limited to Query
          &amp; Buy staff.
        </p>
        <Button asChild className="mt-7 rounded-full">
          <Link href="/">Back to marketplace</Link>
        </Button>
      </main>
    </>
  )
}
