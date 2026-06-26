'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BellIcon, BellOffIcon, CheckIcon, PencilIcon, Trash2Icon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { buildSearchHref, describeSearch } from '@/lib/savedSearches/filters'
import {
  deleteSavedSearch,
  renameSavedSearch,
  setSavedSearchAlerts,
} from '@/app/saved-searches/actions'
import type { SavedSearch } from '@/lib/savedSearches/queries'

export function SavedSearchRow({
  search,
  categoryName,
}: {
  search: SavedSearch
  categoryName?: string | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(search.label ?? '')
  const href = buildSearchHref(search.query_text, search.parsed_filters)
  const chips = describeSearch(search.query_text, search.parsed_filters, categoryName)

  function run(fn: () => Promise<{ ok?: boolean; error?: string }>, success?: string) {
    start(async () => {
      const res = await fn()
      if (res.error) toast.error(res.error)
      else {
        if (success) toast.success(success)
        router.refresh()
      }
    })
  }

  function save() {
    start(async () => {
      const res = await renameSavedSearch(search.id, name)
      if (res.error) toast.error(res.error)
      else {
        toast.success('Renamed')
        setEditing(false)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex items-center gap-2 p-3">
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={80}
              className="h-8 max-w-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') save()
                if (e.key === 'Escape') {
                  setEditing(false)
                  setName(search.label ?? '')
                }
              }}
            />
            <Button size="icon" variant="ghost" className="size-8" disabled={pending} onClick={save} aria-label="Save name">
              <CheckIcon className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => {
                setEditing(false)
                setName(search.label ?? '')
              }}
              aria-label="Cancel"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        ) : (
          <Link href={href} className="block">
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
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          run(() => setSavedSearchAlerts(search.id, !search.notify), search.notify ? 'Alerts off' : 'Alerts on')
        }
        aria-label={search.notify ? 'Disable alerts' : 'Enable alerts'}
        className={cn('shrink-0 gap-1.5', search.notify ? 'text-primary' : 'text-muted-foreground')}
      >
        {search.notify ? <BellIcon className="size-4" /> : <BellOffIcon className="size-4" />}
        <span className="hidden sm:inline">{search.notify ? 'Alerts on' : 'Alerts off'}</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        onClick={() => {
          setEditing(true)
          setName(search.label ?? '')
        }}
        aria-label="Rename saved search"
      >
        <PencilIcon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={() => run(() => deleteSavedSearch(search.id), 'Search deleted.')}
        aria-label="Delete saved search"
        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
      >
        <Trash2Icon className="size-4" />
      </Button>
    </div>
  )
}
