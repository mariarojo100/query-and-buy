import Link from 'next/link'
import { PackageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { OrdersBoard } from '@/components/orders/OrdersBoard'
import { getSellerOrders } from '@/lib/orders/queries'

export const metadata = { title: 'Orders · Query & Buy' }

export default async function SellerOrdersPage() {
  const orders = await getSellerOrders()

  return (
    <section className="space-y-5">
      <h2 className="font-display text-2xl tracking-tight">Orders received</h2>
      {orders.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="No orders yet"
          description="When a buyer negotiates and confirms a deal on one of your listings, it appears here."
          action={
            <Button asChild className="rounded-full">
              <Link href="/account/listings">View my listings</Link>
            </Button>
          }
        />
      ) : (
        <OrdersBoard items={orders} role="seller" />
      )}
    </section>
  )
}
