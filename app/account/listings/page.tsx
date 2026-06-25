import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeftIcon, PackageIcon, PlusIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DashboardListingRow } from '@/components/account/DashboardListingRow'
import { getMyListings } from '@/lib/listings/queries'

export const metadata = { title: 'My listings · Query & Buy' }

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-4 text-center sm:py-5">
        <p className="text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
        <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
      </CardContent>
    </Card>
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
          <h1 className="text-2xl font-semibold tracking-tight">My listings</h1>
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
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <PackageIcon className="size-10 text-muted-foreground/40" />
            <div>
              <p className="font-medium">No listings yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first listing to start selling.
              </p>
            </div>
            <Button asChild>
              <Link href="/sell">Sell an item</Link>
            </Button>
          </div>
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
