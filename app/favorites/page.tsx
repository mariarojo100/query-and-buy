import Link from 'next/link'
import { redirect } from 'next/navigation'
import { HeartIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { Button } from '@/components/ui/button'
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
        <h1 className="mb-5 text-2xl font-semibold tracking-tight">Favorites</h1>

        {listings.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <HeartIcon className="size-10 text-muted-foreground/40" />
            <div>
              <p className="font-medium">No favorites yet</p>
              <p className="text-sm text-muted-foreground">
                Tap the heart on any listing to save it here.
              </p>
            </div>
            <Button asChild>
              <Link href="/">Browse listings</Link>
            </Button>
          </div>
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
