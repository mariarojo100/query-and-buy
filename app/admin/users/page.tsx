import Link from 'next/link'
import { listUsers, PAGE_SIZE } from '@/lib/admin/queries'
import { formatRelativeTime } from '@/lib/format'
import { AdminEmpty, AdminPageHeader, Pagination, StatusBadge } from '@/components/admin/ui'
import { UserRowActions } from '@/components/admin/RowActions'

export const metadata = { title: 'Users · Admin' }

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const page = Number(sp.page ?? 0) || 0
  const { rows, total } = await listUsers({ q: sp.q, page })

  return (
    <>
      <AdminPageHeader title="Users" subtitle={`${total.toLocaleString('en-AE')} members`} />

      <form className="mb-5 flex gap-2">
        <input
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Search name or @username…"
          className="h-9 w-64 rounded-lg border border-border bg-card px-3 text-sm"
        />
        <button className="h-9 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground">
          Search
        </button>
      </form>

      {rows.length === 0 ? (
        <AdminEmpty message="No users found." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Listings</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Sales / Buys</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.display_name}</span>
                        {u.isAdmin && (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{u.email ?? '—'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-4 py-3 tnum text-muted-foreground">{u.listingsCount}</td>
                  <td className="px-4 py-3 tnum text-muted-foreground">
                    {u.rating != null ? `${u.rating.toFixed(1)} (${u.reviewCount})` : '—'}
                  </td>
                  <td className="px-4 py-3 tnum text-muted-foreground">
                    {u.completedSales} / {u.completedPurchases}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatRelativeTime(u.joined)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {u.username && (
                        <Link
                          href={`/u/${u.username}`}
                          target="_blank"
                          className="text-sm text-primary hover:underline"
                        >
                          View
                        </Link>
                      )}
                      <UserRowActions id={u.id} status={u.status} isAdmin={u.isAdmin} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination basePath="/admin/users" params={sp} page={page} pageSize={PAGE_SIZE} total={total} />
    </>
  )
}
