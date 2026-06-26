import {
  CheckCircle2Icon,
  ClockIcon,
  MessageSquareIcon,
  PackageIcon,
  ShoppingCartIcon,
  StarIcon,
  TagIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react'
import { getDashboardStats, getAnalytics } from '@/lib/admin/queries'
import { AdminPageHeader, BarChart, DistributionBars, KpiCard } from '@/components/admin/ui'

export const metadata = { title: 'Dashboard · Admin' }

export default async function AdminDashboard() {
  const [s, a] = await Promise.all([getDashboardStats(), getAnalytics()])

  return (
    <>
      <AdminPageHeader title="Dashboard" subtitle="Marketplace at a glance" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard label="Total users" value={s.totalUsers} icon={UsersIcon} />
        <KpiCard label="Active users" value={s.activeUsers} icon={UsersIcon} />
        <KpiCard label="New today" value={s.newUsersToday} icon={UserPlusIcon} />
        <KpiCard label="Listings" value={s.listings} icon={PackageIcon} />
        <KpiCard label="Active listings" value={s.activeListings} icon={PackageIcon} />
        <KpiCard label="Reserved" value={s.reservedListings} icon={ClockIcon} />
        <KpiCard label="Sold" value={s.soldListings} icon={CheckCircle2Icon} />
        <KpiCard label="Pending moderation" value={s.pendingModeration} icon={ClockIcon} />
        <KpiCard label="Messages today" value={s.messagesToday} icon={MessageSquareIcon} />
        <KpiCard label="Offers created" value={s.offers} icon={TagIcon} />
        <KpiCard label="Orders confirmed" value={s.ordersConfirmed} icon={ShoppingCartIcon} />
        <KpiCard label="Reviews" value={s.reviews} icon={StarIcon} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <ChartCard title="New users" subtitle="Last 14 days">
          <BarChart data={a.newUsers} />
        </ChartCard>
        <ChartCard title="New listings" subtitle="Last 14 days">
          <BarChart data={a.newListings} />
        </ChartCard>
        <ChartCard title="Category distribution" subtitle="Active listings by category">
          <DistributionBars data={a.categoryDistribution} />
        </ChartCard>
        <ChartCard title="Conversion funnel" subtitle="Listings → completed">
          <DistributionBars data={a.funnel} />
        </ChartCard>
      </div>
    </>
  )
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mb-4 text-xs text-muted-foreground">{subtitle}</p>
      {children}
    </div>
  )
}
