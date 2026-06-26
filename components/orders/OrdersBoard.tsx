import { OrderCard } from '@/components/orders/OrderCard'
import type { OrderListItem, OrderStatus } from '@/lib/orders/queries'

const GROUPS: { title: string; statuses: OrderStatus[] }[] = [
  { title: 'In negotiation', statuses: ['negotiating', 'offer_sent'] },
  { title: 'Awaiting confirmation', statuses: ['offer_accepted', 'awaiting_confirmation'] },
  { title: 'Confirmed', statuses: ['confirmed'] },
  { title: 'Completed', statuses: ['completed'] },
  { title: 'Cancelled', statuses: ['cancelled'] },
]

export function OrdersBoard({
  items,
  role,
}: {
  items: OrderListItem[]
  role: 'buyer' | 'seller'
}) {
  return (
    <div className="space-y-8">
      {GROUPS.map((g) => {
        const rows = items.filter((o) => g.statuses.includes(o.status))
        if (rows.length === 0) return null
        return (
          <section key={g.title}>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="eyebrow">{g.title}</h2>
              <span className="text-xs text-muted-foreground">{rows.length}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {rows.map((o) => (
                <OrderCard key={o.id} order={o} role={role} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
