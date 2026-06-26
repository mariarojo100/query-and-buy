import Link from 'next/link'
import { listOrders, PAGE_SIZE } from '@/lib/admin/queries'
import { formatPrice, formatRelativeTime } from '@/lib/format'
import { AdminEmpty, AdminPageHeader, Pagination, StatusBadge } from '@/components/admin/ui'

export const metadata = { title: 'Orders · Admin' }

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'confirmed', label: 'Reserved' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const page = Number(sp.page ?? 0) || 0
  const status = sp.status ?? ''
  const { rows, total } = await listOrders({ status: status || undefined, page })

  return (
    <>
      <AdminPageHeader title="Orders" subtitle={`${total.toLocaleString('en-AE')} orders`} />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/admin/orders?status=${f.key}` : '/admin/orders'}
            className={
              status === f.key
                ? 'rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground'
                : 'rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent'
            }
          >
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <AdminEmpty message="No orders match this filter." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Listing</th>
                <th className="px-4 py-3 font-medium">Buyer</th>
                <th className="px-4 py-3 font-medium">Seller</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3 max-w-[220px] truncate font-medium">{o.listingTitle}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.buyerName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.sellerName}</td>
                  <td className="px-4 py-3 tnum">
                    {o.priceFils != null ? formatPrice(o.priceFils, o.currency) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatRelativeTime(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination basePath="/admin/orders" params={sp} page={page} pageSize={PAGE_SIZE} total={total} />
    </>
  )
}
