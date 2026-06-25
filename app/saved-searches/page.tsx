import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookmarkIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SavedSearchRow } from '@/components/search/SavedSearchRow'
import { getUserSavedSearches } from '@/lib/savedSearches/queries'
import { getActiveCategories } from '@/lib/listings/queries'

export const metadata = { title: 'Saved searches · Query & Buy' }

export default async function SavedSearchesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/saved-searches')

  const [searches, categories] = await Promise.all([
    getUserSavedSearches(),
    getActiveCategories(),
  ])
  const nameBySlug = new Map(categories.map((c) => [c.slug, c.name_en]))

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-5 text-2xl font-semibold tracking-tight">Saved searches</h1>

        {searches.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <BookmarkIcon className="size-10 text-muted-foreground/40" />
            <div>
              <p className="font-medium">No saved searches</p>
              <p className="text-sm text-muted-foreground">
                Run a search, then tap “Save search” to keep it here.
              </p>
            </div>
            <Button asChild>
              <Link href="/">Browse listings</Link>
            </Button>
          </div>
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {searches.map((s) => (
                <SavedSearchRow
                  key={s.id}
                  search={s}
                  categoryName={s.parsed_filters.category ? nameBySlug.get(s.parsed_filters.category) : null}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </>
  )
}
