import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookmarkIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SavedSearchRow } from '@/components/search/SavedSearchRow'
import { EmptyState } from '@/components/common/EmptyState'
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
        <p className="eyebrow">Alerts</p>
        <h1 className="font-display mb-7 mt-2 text-3xl tracking-tight sm:text-4xl">
          Saved searches
        </h1>

        {searches.length === 0 ? (
          <EmptyState
            icon={BookmarkIcon}
            title="Never miss a deal"
            description="Run a search with filters, then tap “Save search” to get back to it in one tap."
            action={
              <Button asChild className="rounded-full">
                <Link href="/">Start a search</Link>
              </Button>
            }
          />
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
