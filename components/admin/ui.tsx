import Link from 'next/link'
import { ChevronLeftIcon, ChevronRightIcon, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ---------------- KPI card ---------------- */
export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string
  value: number | string
  icon?: LucideIcon
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </div>
      <p className="font-display mt-2 text-3xl tracking-tight tnum">
        {typeof value === 'number' ? value.toLocaleString('en-AE') : value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/* ---------------- status badge ---------------- */
const STATUS_TONE: Record<string, string> = {
  active: 'bg-success/10 text-success border-success/30',
  completed: 'bg-success/10 text-success border-success/30',
  confirmed: 'bg-primary/10 text-primary border-primary/30',
  reserved: 'bg-gold/15 text-foreground border-gold/40',
  pending_review: 'bg-gold/15 text-foreground border-gold/40',
  awaiting_confirmation: 'bg-gold/15 text-foreground border-gold/40',
  offer_sent: 'bg-gold/15 text-foreground border-gold/40',
  offer_accepted: 'bg-primary/10 text-primary border-primary/30',
  negotiating: 'bg-muted text-muted-foreground border-border',
  sold: 'bg-muted text-muted-foreground border-border',
  draft: 'bg-muted text-muted-foreground border-border',
  open: 'bg-destructive/10 text-destructive border-destructive/30',
  suspended: 'bg-gold/15 text-foreground border-gold/40',
  banned: 'bg-destructive/10 text-destructive border-destructive/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  deleted: 'bg-destructive/10 text-destructive border-destructive/30',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
  closed: 'bg-muted text-muted-foreground border-border',
  reviewed: 'bg-primary/10 text-primary border-primary/30',
  blocked: 'bg-destructive/10 text-destructive border-destructive/30',
  flagged: 'bg-gold/15 text-foreground border-gold/40',
  allowed: 'bg-success/10 text-success border-success/30',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize',
        STATUS_TONE[status] ?? 'bg-muted text-muted-foreground border-border',
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}

/* ---------------- page header ---------------- */
export function AdminPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

/* ---------------- pagination ---------------- */
export function Pagination({
  basePath,
  params,
  page,
  pageSize,
  total,
}: {
  basePath: string
  params: Record<string, string | undefined>
  page: number
  pageSize: number
  total: number
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const href = (p: number) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v && k !== 'page') sp.set(k, v)
    if (p > 0) sp.set('page', String(p))
    const qs = sp.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }
  if (total <= pageSize) return null
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Page {page + 1} of {totalPages} · {total.toLocaleString('en-AE')} total
      </span>
      <div className="flex gap-2">
        <Link
          href={href(Math.max(0, page - 1))}
          aria-disabled={page === 0}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 transition hover:bg-accent',
            page === 0 && 'pointer-events-none opacity-40',
          )}
        >
          <ChevronLeftIcon className="size-4" /> Prev
        </Link>
        <Link
          href={href(page + 1)}
          aria-disabled={page + 1 >= totalPages}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 transition hover:bg-accent',
            page + 1 >= totalPages && 'pointer-events-none opacity-40',
          )}
        >
          Next <ChevronRightIcon className="size-4" />
        </Link>
      </div>
    </div>
  )
}

/* ---------------- charts ---------------- */
export function BarChart({ data, height = 140 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
          <div
            className="w-full rounded-t-md bg-primary/80 transition-all"
            style={{ height: `${(d.value / max) * (height - 24)}px`, minHeight: d.value > 0 ? 3 : 0 }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="text-[9px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

export function DistributionBars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  if (data.length === 0) return <p className="text-sm text-muted-foreground">No data yet.</p>
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs">
            <span className="text-foreground">{d.label}</span>
            <span className="tnum text-muted-foreground">{d.value.toLocaleString('en-AE')}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------------- empty state ---------------- */
export function AdminEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}
