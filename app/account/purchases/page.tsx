import Link from 'next/link'
import { ShoppingBagIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { OrdersBoard } from '@/components/orders/OrdersBoard'
import { getBuyerOrders } from '@/lib/orders/queries'

export const metadata = { title: 'My purchases · Query & Buy' }

export default async function BuyerPurchasesPage() {
  const orders = await getBuyerOrders()

  return (
    <section className="space-y-5">
      <h2 className="font-display text-2xl tracking-tight">My purchases</h2>
      {orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBagIcon}
          title="No purchases yet"
          description="Start a conversation on a listing and make an offer. Your negotiations and confirmed deals show up here."
          action={
            <Button asChild className="rounded-full">
              <Link href="/">Browse listings</Link>
            </Button>
          }
        />
      ) : (
        <OrdersBoard items={orders} role="buyer" />
      )}
    </section>
  )
}
