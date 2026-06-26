'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckIcon, ExternalLinkIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { REPORT_REASONS } from '@/lib/reports/reasons'
import { updateReportStatus } from '@/app/admin/reports/actions'

export type AdminReport = {
  id: string
  reason: string
  description: string | null
  status: string
  created_at: string
  listing_id: string | null
  reported_user_id: string | null
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800',
  reviewed: 'bg-sky-100 text-sky-800',
  closed: 'bg-muted text-muted-foreground',
}

function reasonLabel(value: string): string {
  return REPORT_REASONS.find((r) => r.value === value)?.label ?? value
}

export function AdminReportRow({ report }: { report: AdminReport }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function setStatus(status: string) {
    startTransition(async () => {
      const res = await updateReportStatus(report.id, status)
      if (res.error) toast.error(res.error)
      else {
        toast.success(status === 'closed' ? 'Report closed.' : 'Marked reviewed.')
        router.refresh()
      }
    })
  }

  const statusClass = STATUS_STYLES[report.status] ?? 'bg-muted text-muted-foreground'

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass}`}
          >
            {report.status}
          </span>
          <span className="text-sm font-medium">{reasonLabel(report.reason)}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(report.created_at).toLocaleString()}
          </span>
        </div>

        {report.description && (
          <p className="whitespace-pre-line text-sm text-muted-foreground">{report.description}</p>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {report.listing_id && (
            <Link
              href={`/listing/${report.listing_id}`}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <ExternalLinkIcon className="size-3" /> Listing
            </Link>
          )}
          {report.reported_user_id && <span>User: {report.reported_user_id.slice(0, 8)}…</span>}
        </div>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pending || report.status === 'reviewed'}
          onClick={() => setStatus('reviewed')}
        >
          <CheckIcon className="size-4" /> Mark reviewed
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending || report.status === 'closed'}
          onClick={() => setStatus('closed')}
        >
          <XIcon className="size-4" /> Close
        </Button>
      </div>
    </div>
  )
}
