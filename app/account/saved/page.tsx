import Link from 'next/link'
import { BookmarkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { SavedSearchRow } from '@/components/search/SavedSearchRow'
import { getUserSavedSearches } from '@/lib/savedSearches/queries'
import { getActiveCategories } from '@/lib/listings/queries'

export const metadata = { title: 'Saved searches · Query & Buy' }

export default async function AccountSavedPage() {
  const [searches, categories] = await Promise.all([getUserSavedSearches(), getActiveCategories()])
  const nameBySlug = new Map(categories.map((c) => [c.slug, c.name_en]))

  return (
    <section className="space-y-5">
      <h2 className="font-display text-2xl tracking-tight">Saved searches</h2>
      {searches.length === 0 ? (
        <EmptyState
          icon={BookmarkIcon}
          title="No saved searches"
          description="Search the marketplace, then tap “Save search” to get back to your results in one click."
          action={
            <Button asChild className="rounded-full">
              <Link href="/">Start a search</Link>
            </Button>
          }
        />
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          {searches.map((s) => (
            <SavedSearchRow
              key={s.id}
              search={s}
              categoryName={s.parsed_filters.category ? nameBySlug.get(s.parsed_filters.category) : null}
            />
          ))}
        </div>
      )}
    </section>
  )
}
