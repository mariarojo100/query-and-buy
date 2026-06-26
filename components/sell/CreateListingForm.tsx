'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlusIcon, Loader2Icon, SparklesIcon, XIcon } from 'lucide-react'
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
import { createListing } from '@/app/sell/actions'
import { createClient } from '@/utils/supabase/client'
import { EMIRATES } from '@/lib/profile/emirates'
import { CONDITIONS } from '@/lib/listings/conditions'
import { LISTING_IMAGES_BUCKET } from '@/lib/storage'
import { analyzeListingSafety, PROHIBITED_MESSAGE } from '@/lib/safety/listing-safety'
import { generateListingDraft, type AiDraft, type AiPricing } from '@/app/sell/aiActions'
import { fileToAiImage } from '@/lib/ai/image-client'
import { PriceSuggestions } from '@/components/sell/PriceSuggestions'

const MAX_BYTES = 5 * 1024 * 1024
const MAX_IMAGES = 8
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

type Pic = { file: File; url: string }

export function CreateListingForm({
  userId,
  categories,
}: {
  userId: string
  categories: Category[]
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [pics, setPics] = useState<Pic[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [condition, setCondition] = useState<string>('used')
  const [emirate, setEmirate] = useState('')
  const [area, setArea] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [detected, setDetected] = useState<AiDraft['detected'] | null>(null)
  const [pricing, setPricing] = useState<AiPricing | null>(null)
  const [aiWarning, setAiWarning] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<{ categories: string[] } | null>(null)

  async function onGenerate() {
    if (pics.length === 0) {
      toast.error('Add at least one photo first.')
      return
    }
    setAiLoading(true)
    try {
      const imgs = []
      for (const p of pics.slice(0, 5)) imgs.push(await fileToAiImage(p.file))
      const res = await generateListingDraft(imgs)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      const d = res.draft
      setDetected(d.detected)
      setPricing(d.pricing)
      setAiWarning(d.warning)

      // Low overall confidence → nothing auto-fills; keep photos + manual flow.
      if (d.warning) {
        toast.warning(d.warning)
        return
      }

      if (d.title) setTitle(d.title)
      if (d.description) setDescription(d.description)
      if (d.categoryId) setCategoryId(d.categoryId)
      if (d.condition) setCondition(d.condition)
      toast.success(
        d.lowConfidence.length
          ? `AI filled what it could — double-check: ${d.lowConfidence.join(', ')}.`
          : 'AI drafted your listing. Review and edit before publishing.',
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI generation failed.')
    } finally {
      setAiLoading(false)
    }
  }

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
      next.push({ file, url: URL.createObjectURL(file) })
    }
    setPics((prev) => [...prev, ...next].slice(0, MAX_IMAGES))
  }

  function removeAt(i: number) {
    setPics((prev) => {
      URL.revokeObjectURL(prev[i].url)
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
    if (pics.length === 0) return toast.error('Add at least one photo.')

    // Safety screen BEFORE uploading photos or calling the publish flow.
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
      for (let i = 0; i < pics.length; i++) {
        const { file } = pics[i]
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const key = `${userId}/${groupId}/${i}.${ext}`
        const { error } = await supabase.storage
          .from(LISTING_IMAGES_BUCKET)
          .upload(key, file, { cacheControl: '3600', upsert: true })
        if (error) throw new Error(`Image upload failed: ${error.message}`)
        images.push({ storage_key: key, position: i })
      }

      const res = await createListing({
        title,
        description,
        priceAed: Number(price),
        category_id: categoryId,
        condition,
        emirate,
        area,
        images,
      })
      // Server-side enforcement (defense in depth).
      if (res.blocked) {
        setBlocked({ categories: res.categories ?? [] })
        toast.error('This item is not allowed on Query & Buy.')
        setSubmitting(false)
        return
      }
      if (res.error || !res.id) throw new Error(res.error ?? 'Could not create listing.')

      toast.success('Listing published!')
      router.push(`/listing/${res.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Photos */}
      <div className="space-y-3">
        <h2 className="font-display text-lg leading-none">Photos</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {pics.map((p, i) => (
            <div
              key={p.url}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="size-full object-cover" />
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
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground transition hover:bg-muted"
            >
              <ImagePlusIcon className="size-5" />
              <span className="text-xs">Add</span>
            </button>
          )}
        </div>
        <input
          ref={fileRef}
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

        {/* Generate with AI */}
        <div className="space-y-3 rounded-xl border border-border bg-accent/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Add photos, then let AI draft your title, description, category, and condition.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onGenerate}
              disabled={aiLoading || pics.length === 0}
              className="shrink-0"
            >
              {aiLoading ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SparklesIcon className="size-4" />
              )}
              {aiLoading ? 'Analyzing…' : 'Generate with AI'}
            </Button>
          </div>
          {aiWarning && (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {aiWarning}
            </p>
          )}
          {detected && detected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {detected.map((d, i) => (
                <span
                  key={i}
                  title={`${d.confidence}% confidence`}
                  className={`rounded-full border px-2 py-0.5 text-xs ${
                    d.confidence < 70
                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                      : 'bg-background text-muted-foreground'
                  }`}
                >
                  {d.label}: {d.value} · {d.confidence}%
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-8">
        <h2 className="font-display text-lg leading-none">Details</h2>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="e.g. iPhone 14 Pro, 256GB, excellent condition"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} />
      </div>

      <div className="border-t border-border pt-8">
        <h2 className="font-display text-lg leading-none">Pricing</h2>
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
            placeholder="0"
            required
          />
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

      {pricing && (
        <PriceSuggestions
          pricing={pricing}
          currentPrice={price}
          onApply={(aed) => setPrice(String(aed))}
        />
      )}

      <div className="border-t border-border pt-8">
        <h2 className="font-display text-lg leading-none">Location</h2>
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

      <div className="border-t border-border pt-8">
        <h2 className="font-display text-lg leading-none">Description</h2>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="Describe your item — condition, history, what's included…"
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

      <Button type="submit" disabled={submitting} size="lg" className="w-full sm:w-auto">
        {submitting && <Loader2Icon className="size-4 animate-spin" />}
        {submitting ? 'Publishing…' : 'Publish listing'}
      </Button>
    </form>
  )
}
