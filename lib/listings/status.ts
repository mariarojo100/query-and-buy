/** listing_status enum → display label + badge classes. */
export const STATUS_META: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  pending_review: { label: 'In review', className: 'bg-amber-100 text-amber-800' },
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-800' },
  sold: { label: 'Sold', className: 'bg-sky-100 text-sky-800' },
  expired: { label: 'Expired', className: 'bg-muted text-muted-foreground' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
  deleted: { label: 'Deleted', className: 'bg-red-100 text-red-800' },
}

export function statusMeta(status: string) {
  return STATUS_META[status] ?? { label: status, className: 'bg-muted text-muted-foreground' }
}
