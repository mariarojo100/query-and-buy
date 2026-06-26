import { listAiModeration, PAGE_SIZE } from '@/lib/admin/queries'
import { formatRelativeTime } from '@/lib/format'
import { AdminEmpty, AdminPageHeader, Pagination, StatusBadge } from '@/components/admin/ui'
import { AiRowActions } from '@/components/admin/RowActions'

export const metadata = { title: 'AI Moderation · Admin' }

export default async function AdminAiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const page = Number(sp.page ?? 0) || 0
  const { rows, total } = await listAiModeration({ page })

  return (
    <>
      <AdminPageHeader
        title="AI moderation log"
        subtitle="Automated decisions on uploads and listings"
      />

      {rows.length === 0 ? (
        <AdminEmpty message="No AI moderation decisions logged yet." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Decision</th>
                <th className="px-4 py-3 font-medium">Confidence</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Override</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3 capitalize text-muted-foreground">{r.source}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.decision} />
                  </td>
                  <td className="px-4 py-3 tnum text-muted-foreground">
                    {r.confidence != null ? `${Math.round(r.confidence)}%` : '—'}
                  </td>
                  <td className="px-4 py-3 max-w-[280px] truncate text-muted-foreground">
                    {r.reason ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {r.human_override ? (
                      <StatusBadge status={r.human_override === 'approved' ? 'allowed' : 'rejected'} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatRelativeTime(r.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <AiRowActions id={r.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination basePath="/admin/ai" params={sp} page={page} pageSize={PAGE_SIZE} total={total} />
    </>
  )
}
