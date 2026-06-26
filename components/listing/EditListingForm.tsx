'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlusIcon, Loader2Icon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CategorySelect, type Category } from '@/components/sell/CategorySelect'
import { updateListing } from '@/app/account/listings/actions'
import { createClient } from '@/utils/supabase/client'
import { EMIRATES } from '@/lib/profile/emirates'
import { CONDITIONS } from '@/lib/listings/conditions'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import { analyzeListingSafety, PROHIBITED_MESSAGE } from '@/lib/safety/listing-safety'
import { formatPrice } from '@/lib/format'
import type { EditListing } from '@/lib/listings/queries'

const MAX_BYTES = 5 * 1024 * 1024
const MAX_IMAGES = 8
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

type Pic =
  | { kind: 'existing'; storage_key: string }
  | { kind: 'new'; file: File; url: string }

function previewSrc(p: Pic): string {
  return p.kind === 'existing' ? publicUrl(LISTING_IMAGES_BUCKET, p.storage_key) : p.url
}

export function EditListingForm({
  userId,
  listing,
  categories,
}: {
  userId: string
  listing: EditListing
  categories: Category[]
}) {
  const router = useRouter()
  const fileInputId = `edit-photos-${listing.id}`

  const [pics, setPics] = useState<Pic[]>(
    listing.images.map((i) => ({ kind: 'existing', storage_key: i.storage_key })),
  )
  const [title, setTitle] = useState(listing.title_en)
  const [description, setDescription] = useState(listing.description)
  const [price, setPrice] = useState(String(listing.price_fils / 100))
  const [categoryId, setCategoryId] = useState(listing.category_id)
  const [condition, setCondition] = useState(listing.condition)
  const [emirate, setEmirate] = useState(listing.emirate ?? '')
  const [area, setArea] = useState(listing.area ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [blocked, setBlocked] = useState<{ categories: string[] } | null>(null)

  function addFiles(list: FileList | null) {
    if (!list) return
    const next: Pic[] = []
    for (const file of Array.from(list)) {
      if (!ALLOWED.includes(file.type)) {
        toast.error(`${file.name}: unsupported format.`)
        continue
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: larger than 5 MB.`)
        continue
      }
      next.push({ kind: 'new', file, url: URL.createObjectURL(file) })
    }
    setPics((prev) => [...prev, ...next].slice(0, MAX_IMAGES))
  }

  function removeAt(i: number) {
    setPics((prev) => {
      const p = prev[i]
      if (p.kind === 'new') URL.revokeObjectURL(p.url)
      return prev.filter((_, idx) => idx !== i)
    })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (title.trim().length < 3) return toast.error('Title must be at least 3 characters.')
    if (description.trim().length < 10)
      return toast.error('Description must be at least 10 characters.')
    if (!price || Number(price) < 0) return toast.error('Enter a valid price.')
    if (!categoryId) return toast.error('Choose a category.')
    if (!emirate) return toast.error('Choose an emirate.')
    if (pics.length === 0) return toast.error('Keep at least one photo.')

    // Safety screen BEFORE uploading photos or saving.
    const safety = analyzeListingSafety(title, description)
    if (!safety.safe) {
      setBlocked({ categories: safety.categories })
      toast.error('This item is not allowed on Query & Buy.')
      return
    }
    setBlocked(null)

    setSubmitting(true)
    try {
      const supabase = createClient()
      const groupId = crypto.randomUUID()
      const images = []
      let newIdx = 0
      for (let i = 0; i < pics.length; i++) {
        const p = pics[i]
        if (p.kind === 'existing') {
          images.push({ storage_key: p.storage_key, position: i })
        } else {
          const ext = p.file.name.split('.').pop()?.toLowerCase() || 'jpg'
          const key = `${userId}/${groupId}/${newIdx}.${ext}`
          newIdx++
          const { error } = await supabase.storage
            .from(LISTING_IMAGES_BUCKET)
            .upload(key, p.file, { cacheControl: '3600', upsert: true })
          if (error) throw new Error(`Image upload failed: ${error.message}`)
          images.push({ storage_key: key, position: i })
        }
      }

      const res = await updateListing({
        id: listing.id,
        title,
        description,
        priceAed: Number(price),
        category_id: categoryId,
        condition,
        emirate,
        area,
        images,
      })
      if (res.blocked) {
        setBlocked({ categories: res.categories ?? [] })
        toast.error('This item is not allowed on Query & Buy.')
        setSubmitting(false)
        return
      }
      if (res.error) throw new Error(res.error)

      toast.success('Listing updated.')
      router.push(`/listing/${listing.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>Photos</Label>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {pics.map((p, i) => (
            <div
              key={p.kind === 'existing' ? p.storage_key : p.url}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSrc(p)} alt="" className="size-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100"
                aria-label="Remove photo"
              >
                <XIcon className="size-3.5" />
              </button>
            </div>
          ))}
          {pics.length < MAX_IMAGES && (
            <label
              htmlFor={fileInputId}
              className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground transition hover:bg-muted"
            >
              <ImagePlusIcon className="size-5" />
              <span className="text-xs">Add</span>
            </label>
          )}
        </div>
        <input
          id={fileInputId}
          type="file"
          accept={ALLOWED.join(',')}
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <p className="text-xs text-muted-foreground">
          Up to {MAX_IMAGES} photos, 5 MB each. The first photo is the cover.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="price">Price (AED)</Label>
          <Input
            id="price"
            type="number"
            min={0}
            step="1"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          {price && Number(price) >= 0 && (
            <p className="text-xs text-muted-foreground">
              {formatPrice(Math.round(Number(price) * 100))}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="condition">Condition</Label>
          <Select value={condition} onValueChange={setCondition}>
            <SelectTrigger id="condition" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="emirate">Emirate</Label>
          <Select value={emirate || undefined} onValueChange={setEmirate}>
            <SelectTrigger id="emirate" className="w-full">
              <SelectValue placeholder="Select emirate" />
            </SelectTrigger>
            <SelectContent>
              {EMIRATES.map((e) => (
                <SelectItem key={e.value} value={e.value}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="area">Area (optional)</Label>
          <Input
            id="area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. Dubai Marina"
            maxLength={80}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          maxLength={2000}
          required
        />
      </div>

      {blocked && (
        <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <p className="whitespace-pre-line font-medium">{PROHIBITED_MESSAGE}</p>
          {blocked.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {blocked.categories.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-white"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting} size="lg">
          {submitting && <Loader2Icon className="size-4 animate-spin" />}
          {submitting ? 'Saving…' : 'Save changes'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.push(`/listing/${listing.id}`)}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
