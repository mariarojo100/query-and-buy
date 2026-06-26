import Link from 'next/link'
import { HeartIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { ListingResults } from '@/components/listing/ListingResults'
import { getUserFavorites } from '@/lib/favorites/queries'

export const metadata = { title: 'Wishlist · Query & Buy' }

export default async function AccountWishlistPage() {
  const listings = await getUserFavorites()

  return (
    <section className="space-y-5">
      <h2 className="font-display text-2xl tracking-tight">Wishlist</h2>
      {listings.length === 0 ? (
        <EmptyState
          icon={HeartIcon}
          title="No saved items yet"
          description="Tap the heart on any listing to save it here for later."
          action={
            <Button asChild className="rounded-full">
              <Link href="/">Browse listings</Link>
            </Button>
          }
        />
      ) : (
        <ListingResults
          listings={listings}
          count={listings.length}
          favoritedIds={new Set(listings.map((l) => l.id))}
          authed
        />
      )}
    </section>
  )
}
