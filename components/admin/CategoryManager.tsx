'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  EyeOffIcon,
  PencilIcon,
  PlusIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  createCategory,
  moveCategory,
  toggleCategory,
  updateCategory,
} from '@/app/admin/actions'
import type { AdminCategory } from '@/lib/admin/queries'

export function CategoryManager({ categories }: { categories: AdminCategory[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const parents = categories.filter((c) => !c.parent_id)

  function run(fn: () => Promise<{ ok?: boolean; error?: string }>, after?: () => void) {
    start(async () => {
      const r = await fn()
      if (r?.error) toast.error(r.error)
      else {
        after?.()
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <p className="mb-3 text-sm font-semibold">Add category</p>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Name (English)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-48"
          />
          <Input
            placeholder="slug (optional)"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            className="w-40"
          />
          <Button
            disabled={pending || !newName.trim()}
            onClick={() =>
              run(
                () => createCategory({ slug: newSlug || newName, name_en: newName }),
                () => {
                  setNewName('')
                  setNewSlug('')
                },
              )
            }
            className="rounded-full"
          >
            <PlusIcon className="size-4" /> Add
          </Button>
        </div>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {parents.map((c, i) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex flex-col">
              <button
                disabled={pending || i === 0}
                onClick={() => run(() => moveCategory(c.id, 'up'))}
                className="text-muted-foreground disabled:opacity-30"
                aria-label="Move up"
              >
                <ChevronUpIcon className="size-3.5" />
              </button>
              <button
                disabled={pending || i === parents.length - 1}
                onClick={() => run(() => moveCategory(c.id, 'down'))}
                className="text-muted-foreground disabled:opacity-30"
                aria-label="Move down"
              >
                <ChevronDownIcon className="size-3.5" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              {editId === c.id ? (
                <div className="flex gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 w-48"
                  />
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => updateCategory(c.id, editName), () => setEditId(null))}
                  >
                    Save
                  </Button>
                </div>
              ) : (
                <p
                  className={cn(
                    'text-sm font-medium',
                    !c.is_active && 'text-muted-foreground line-through',
                  )}
                >
                  {c.name_en}
                </p>
              )}
              <p className="text-xs text-muted-foreground">/{c.slug}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => {
                setEditId(c.id)
                setEditName(c.name_en)
              }}
              aria-label="Edit"
            >
              <PencilIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={pending}
              onClick={() => run(() => toggleCategory(c.id, !c.is_active))}
              aria-label={c.is_active ? 'Hide' : 'Show'}
            >
              {c.is_active ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
