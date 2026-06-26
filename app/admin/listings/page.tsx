import Image from 'next/image'
import { listListings, listAdminCategories, PAGE_SIZE } from '@/lib/admin/queries'
import { formatPrice, formatRelativeTime } from '@/lib/format'
import {
  AdminEmpty,
  AdminPageHeader,
  Pagination,
  StatusBadge,
} from '@/components/admin/ui'
import { ListingRowActions, ViewListingLink } from '@/components/admin/RowActions'

export const metadata = { title: 'Listings · Admin' }

const STATUSES = ['active', 'reserved', 'sold', 'pending_review', 'rejected', 'deleted', 'draft']

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const page = Number(sp.page ?? 0) || 0
  const [{ rows, total }, categories] = await Promise.all([
    listListings({
      q: sp.q,
      status: sp.status,
      categoryId: sp.category,
      sellerId: sp.seller,
      since: sp.since,
      featured: sp.featured === '1',
      page,
    }),
    listAdminCategories(),
  ])

  return (
    <>
      <AdminPageHeader title="Listings" subtitle={`${total.toLocaleString('en-AE')} listings`} />

      <form className="mb-5 flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Search title…"
          className="h-9 w-48 rounded-lg border border-border bg-card px-3 text-sm"
        />
        <select
          name="status"
          defaultValue={sp.status ?? ''}
          className="h-9 rounded-lg border border-border bg-card px-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select
          name="category"
          defaultValue={sp.category ?? ''}
          className="h-9 rounded-lg border border-border bg-card px-2 text-sm"
        >
          <option value="">All categories</option>
          {categories
            .filter((c) => !c.parent_id)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_en}
              </option>
            ))}
        </select>
        <input
          type="date"
          name="since"
          defaultValue={sp.since ?? ''}
          className="h-9 rounded-lg border border-border bg-card px-2 text-sm"
        />
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input type="checkbox" name="featured" value="1" defaultChecked={sp.featured === '1'} />
          Featured
        </label>
        <button className="h-9 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground">
          Filter
        </button>
      </form>

      {rows.length === 0 ? (
        <AdminEmpty message="No listings match these filters." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Listing</th>
                <th className="px-4 py-3 font-medium">Seller</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {r.cover && (
                          <Image src={r.cover} alt="" fill sizes="40px" className="object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="max-w-[220px] truncate font-medium">{r.title_en}</p>
                        {r.is_featured && (
                          <span className="text-[10px] font-semibold uppercase text-gold">Featured</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.sellerName}</td>
                  <td className="px-4 py-3 tnum">{formatPrice(r.price_fils, r.currency)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatRelativeTime(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <ViewListingLink id={r.id} />
                      <ListingRowActions id={r.id} status={r.status} featured={r.is_featured} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination basePath="/admin/listings" params={sp} page={page} pageSize={PAGE_SIZE} total={total} />
    </>
  )
}
