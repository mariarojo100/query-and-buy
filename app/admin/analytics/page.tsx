import { getAnalytics } from '@/lib/admin/queries'
import { AdminPageHeader, BarChart, DistributionBars } from '@/components/admin/ui'

export const metadata = { title: 'Analytics · Admin' }

export default async function AdminAnalyticsPage() {
  const a = await getAnalytics()

  return (
    <>
      <AdminPageHeader title="Analytics" subtitle="Trends across the last 14 days" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Daily new users">
          <BarChart data={a.newUsers} />
        </Card>
        <Card title="Listings created">
          <BarChart data={a.newListings} />
        </Card>
        <Card title="Completed sales">
          <BarChart data={a.completedSales} />
        </Card>
        <Card title="Conversion funnel">
          <DistributionBars data={a.funnel} />
        </Card>
        <Card title="Category distribution">
          <DistributionBars data={a.categoryDistribution} />
        </Card>
        <Card title="Top searched keywords">
          <DistributionBars data={a.topKeywords} />
          {a.topKeywords.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              No search-query log exists yet — this populates once search logging is enabled.
            </p>
          )}
        </Card>
      </div>
    </>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="mb-4 text-sm font-semibold">{title}</p>
      {children}
    </div>
  )
}
