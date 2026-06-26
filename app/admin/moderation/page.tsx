import Link from 'next/link'
import { listReports } from '@/lib/admin/queries'
import { formatRelativeTime } from '@/lib/format'
import { AdminEmpty, AdminPageHeader, StatusBadge } from '@/components/admin/ui'
import { ModerationRowActions } from '@/components/admin/RowActions'

export const metadata = { title: 'Moderation · Admin' }

export default async function AdminModerationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const status = sp.status ?? 'open'
  const reports = await listReports({ status: status === 'all' ? undefined : status })

  const tabs = [
    { key: 'open', label: 'Open' },
    { key: 'reviewed', label: 'Reviewed' },
    { key: 'closed', label: 'Closed' },
    { key: 'all', label: 'All' },
  ]

  return (
    <>
      <AdminPageHeader title="Reports & moderation" subtitle="Reported listings, users, and messages" />

      <div className="mb-5 flex gap-2">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/moderation?status=${t.key}`}
            className={
              status === t.key
                ? 'rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground'
                : 'rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent'
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

      {reports.length === 0 ? (
        <AdminEmpty message="No reports in this queue." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Reporter</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3">
                    {r.listing_id ? (
                      <Link
                        href={`/listing/${r.listing_id}`}
                        target="_blank"
                        className="text-primary hover:underline"
                      >
                        {r.target}
                      </Link>
                    ) : (
                      <span>{r.target}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium capitalize">{r.reason.replace(/_/g, ' ')}</span>
                    {r.description && (
                      <p className="max-w-[280px] truncate text-xs text-muted-foreground">
                        {r.description}
                      </p>
                    )}
                    {r.admin_notes && (
                      <p className="mt-0.5 text-xs italic text-muted-foreground">Note: {r.admin_notes}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.reporterName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatRelativeTime(r.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <ModerationRowActions reportId={r.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
