'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon, SparklesIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          run(text)
        }}
        className="flex items-center gap-2 rounded-full border border-border bg-card p-1.5 pl-5 shadow-soft transition focus-within:border-gold/40 focus-within:ring-1 focus-within:ring-gold/30"
      >
        <SparklesIcon className="size-4 shrink-0 text-gold" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search naturally — “iPhone under AED 2000 in Dubai”"
          aria-label="Conversational search"
          className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button
          type="submit"
          disabled={loading || !text.trim()}
          className="shrink-0 rounded-full px-5"
        >
          {loading ? <Loader2Icon className="size-4 animate-spin" /> : 'Search'}
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={loading}
            onClick={() => {
              setText(ex)
              run(ex)
            }}
            className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:border-gold/40 hover:text-foreground disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  )
}
