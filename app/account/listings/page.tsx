import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeftIcon, PackageIcon, PlusIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DashboardListingRow } from '@/components/account/DashboardListingRow'
import { EmptyState } from '@/components/common/EmptyState'
import { getMyListings } from '@/lib/listings/queries'

export const metadata = { title: 'My listings · Query & Buy' }

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="font-display text-3xl tracking-tight tabular-nums sm:text-4xl">
        {value.toLocaleString('en-AE')}
      </p>
      <p className="eyebrow mt-2">{label}</p>
    </div>
  )
}

export default async function SellerDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/account/listings')

  const listings = await getMyListings()
  const activeCount = listings.filter((l) => l.status === 'active').length
  const soldCount = listings.filter((l) => l.status === 'sold').length
  const totalViews = listings.reduce((sum, l) => sum + (l.view_count ?? 0), 0)

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/account"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" /> Account
        </Link>

        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl tracking-tight sm:text-4xl">My listings</h1>
          <Button asChild size="sm">
            <Link href="/sell">
              <PlusIcon className="size-4" />
              <span className="hidden sm:inline">New listing</span>
            </Link>
          </Button>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <Metric label="Active" value={activeCount} />
          <Metric label="Sold" value={soldCount} />
          <Metric label="Total views" value={totalViews} />
        </div>

        {listings.length === 0 ? (
          <EmptyState
            icon={PackageIcon}
            title="Sell your first item"
            description="Snap a few photos and let AI write the title, description, and price. It takes about a minute."
            action={
              <Button asChild className="rounded-full">
                <Link href="/sell">Start selling</Link>
              </Button>
            }
          />
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {listings.map((l) => (
                <DashboardListingRow key={l.id} listing={l} />
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </>
  )
}
