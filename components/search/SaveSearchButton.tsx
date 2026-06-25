'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { BookmarkIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { saveSearch } from '@/app/saved-searches/actions'
import { EMIRATES } from '@/lib/profile/emirates'
import { CONDITIONS } from '@/lib/listings/conditions'

function prettySlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function defaultLabel(params: URLSearchParams): string {
  const parts: string[] = []
  const q = params.get('q')
  if (q) parts.push(q)
  const cat = params.get('category')
  if (cat) parts.push(prettySlug(cat))
  const em = params.get('emirate')
  if (em) parts.push(EMIRATES.find((e) => e.value === em)?.label ?? em)
  const cond = params.get('condition')
  if (cond) parts.push(CONDITIONS.find((c) => c.value === cond)?.label ?? cond)
  return parts.join(' · ') || 'All listings'
}

export function SaveSearchButton({ authed }: { authed: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  function redirectTo() {
    const qs = params.toString()
    return encodeURIComponent(qs ? `${pathname}?${qs}` : pathname)
  }

  function onOpen() {
    if (!authed) {
      router.push(`/login?redirectTo=${redirectTo()}`)
      return
    }
    setName(defaultLabel(params))
    setOpen(true)
  }

  async function submit() {
    setSaving(true)
    const res = await saveSearch({
      label: name.trim(),
      query: params.get('q') ?? '',
      filters: {
        category: params.get('category') ?? undefined,
        emirate: params.get('emirate') ?? undefined,
        condition: params.get('condition') ?? undefined,
        min: params.get('min') ?? undefined,
        max: params.get('max') ?? undefined,
        sort: params.get('sort') ?? undefined,
      },
    })
    setSaving(false)
    if (res.needAuth) {
      router.push(`/login?redirectTo=${redirectTo()}`)
    } else if (res.error) {
      toast.error(res.error)
    } else {
      setOpen(false)
      toast.success('Search saved.', {
        action: { label: 'View', onClick: () => router.push('/saved-searches') },
      })
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={onOpen} className="shrink-0">
        <BookmarkIcon className="size-4" />
        <span className="hidden sm:inline">Save search</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save this search</DialogTitle>
            <DialogDescription>
              Get back to these filters anytime from Saved searches.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="search-name">Name</Label>
            <Input
              id="search-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving || !name.trim()}>
              {saving && <Loader2Icon className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
