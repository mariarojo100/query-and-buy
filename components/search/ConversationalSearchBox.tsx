'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon, SparklesIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { parseConversationalSearch } from '@/app/search/actions'
import { buildSearchHref } from '@/lib/savedSearches/filters'

const EXAMPLES = [
  'iPhone under AED 2000 in Dubai',
  'Used MacBook Pro in Sharjah',
  'Family SUV below AED 50000',
]

export function ConversationalSearchBox() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  async function run(value: string) {
    const t = value.trim()
    if (!t || loading) return
    setLoading(true)
    try {
      const res = await parseConversationalSearch(t)
      if (!res.aiUsed) toast.message(`Searching for “${t}”`)
      else toast.success('Search understood — filters applied below.')
      router.push(buildSearchHref(res.query, res.filters))
    } catch {
      // Ultimate fallback: keyword search on the raw text.
      router.push(buildSearchHref(t, {}))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          run(text)
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <SparklesIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe what you want — e.g. iPhone under AED 2000 in Dubai"
            className="pl-9"
            aria-label="Conversational search"
          />
        </div>
        <Button type="submit" disabled={loading || !text.trim()} className="shrink-0">
          {loading ? <Loader2Icon className="size-4 animate-spin" /> : <SparklesIcon className="size-4" />}
          {loading ? 'Thinking…' : 'Ask AI'}
        </Button>
      </form>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={loading}
            onClick={() => {
              setText(ex)
              run(ex)
            }}
            className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-muted disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  )
}
