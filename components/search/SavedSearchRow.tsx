'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRightIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { buildSearchHref, describeSearch } from '@/lib/savedSearches/filters'
import { deleteSavedSearch } from '@/app/saved-searches/actions'
import type { SavedSearch } from '@/lib/savedSearches/queries'

export function SavedSearchRow({
  search,
  categoryName,
}: {
  search: SavedSearch
  categoryName?: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const href = buildSearchHref(search.query_text, search.parsed_filters)
  const chips = describeSearch(search.query_text, search.parsed_filters, categoryName)

  function onDelete() {
    startTransition(async () => {
      const res = await deleteSavedSearch(search.id)
      if (res.error) toast.error(res.error)
      else {
        toast.success('Search deleted.')
        router.refresh()
      }
    })
  }

  return (
    <div className="flex items-center gap-2 p-3">
      <Link href={href} className="min-w-0 flex-1">
        <p className="truncate font-medium">{search.label ?? 'Saved search'}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {chips.map((c, i) => (
            <span
              key={i}
              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {c}
            </span>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Saved {new Date(search.created_at).toLocaleDateString()}
        </p>
      </Link>

      <Button asChild variant="ghost" size="sm" className="hidden shrink-0 sm:inline-flex">
        <Link href={href}>
          Open <ChevronRightIcon className="size-4" />
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        disabled={pending}
        aria-label="Delete saved search"
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        <Trash2Icon className="size-4" />
      </Button>
    </div>
  )
}
