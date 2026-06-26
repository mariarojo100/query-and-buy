import Link from 'next/link'
import { redirect } from 'next/navigation'
import { HeartIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { ListingResults } from '@/components/listing/ListingResults'
import { getUserFavorites } from '@/lib/favorites/queries'

export const metadata = { title: 'Favorites · Query & Buy' }

export default async function FavoritesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/favorites')

  const listings = await getUserFavorites()
  const favoritedIds = new Set(listings.map((l) => l.id))

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <p className="eyebrow">Saved</p>
        <h1 className="font-display mb-7 mt-2 text-3xl tracking-tight sm:text-4xl">Favorites</h1>

        {listings.length === 0 ? (
          <EmptyState
            icon={HeartIcon}
            title="Save listings you love"
            description="Tap the heart on any listing to keep it here for later — no pressure to decide now."
            action={
              <Button asChild className="rounded-full">
                <Link href="/">Browse listings</Link>
              </Button>
            }
            secondaryAction={
              <Button asChild variant="ghost" className="rounded-full">
                <Link href="/sell">Sell an item</Link>
              </Button>
            }
          />
        ) : (
          <ListingResults
            listings={listings}
            count={listings.length}
            favoritedIds={favoritedIds}
            authed
          />
        )}
      </main>
    </>
  )
}
