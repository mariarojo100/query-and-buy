import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/lib/orders/queries'

const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  negotiating: { label: 'Negotiating', cls: 'bg-muted text-muted-foreground border-border' },
  offer_sent: { label: 'Offer on table', cls: 'bg-gold/15 text-foreground border-gold/40' },
  offer_accepted: { label: 'Offer accepted', cls: 'bg-primary/10 text-primary border-primary/30' },
  awaiting_confirmation: {
    label: 'Awaiting confirmation',
    cls: 'bg-gold/15 text-foreground border-gold/40',
  },
  confirmed: { label: 'Confirmed', cls: 'bg-primary text-primary-foreground border-transparent' },
  completed: { label: 'Completed', cls: 'bg-primary/10 text-primary border-primary/30' },
  cancelled: { label: 'Cancelled', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const s = STATUS[status] ?? STATUS.negotiating
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
        s.cls,
      )}
    >
      {s.label}
    </span>
  )
}
