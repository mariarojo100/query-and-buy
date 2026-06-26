import { listAuditLog, PAGE_SIZE } from '@/lib/admin/queries'
import { formatRelativeTime } from '@/lib/format'
import { AdminEmpty, AdminPageHeader, Pagination } from '@/components/admin/ui'

export const metadata = { title: 'Audit log · Admin' }

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const page = Number(sp.page ?? 0) || 0
  const { rows, total } = await listAuditLog({ page })

  return (
    <>
      <AdminPageHeader title="Audit log" subtitle="Every admin action, recorded" />

      {rows.length === 0 ? (
        <AdminEmpty message="No admin actions recorded yet." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3 font-medium">{r.adminName}</td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.action}</code>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.target_type ? `${r.target_type}` : '—'}
                    {r.target_id && (
                      <span className="ml-1 text-xs opacity-60">{r.target_id.slice(0, 8)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatRelativeTime(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination basePath="/admin/audit" params={sp} page={page} pageSize={PAGE_SIZE} total={total} />
    </>
  )
}
