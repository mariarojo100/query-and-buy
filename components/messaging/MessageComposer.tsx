'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SendIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { sendMessage } from '@/app/messages/actions'

export function MessageComposer({
  conversationId,
  disabled = false,
}: {
  conversationId: string
  disabled?: boolean
}) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [pending, startTransition] = useTransition()

  function submit() {
    const body = text.trim()
    if (!body || pending) return
    startTransition(async () => {
      const res = await sendMessage(conversationId, body)
      if (res.error) toast.error(res.error)
      else {
        setText('')
        router.refresh()
      }
    })
  }

  if (disabled) {
    return (
      <div className="border-t p-3 text-center text-sm text-muted-foreground">
        This conversation is closed.
      </div>
    )
  }

  return (
    <div
      className="border-t border-border bg-background/85 p-3 backdrop-blur"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="flex items-end gap-2"
      >
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          rows={1}
          placeholder="Write a message…"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl bg-card px-4 py-2.5"
          aria-label="Message"
        />
        <Button
          type="submit"
          size="icon"
          disabled={pending || !text.trim()}
          aria-label="Send"
          className="size-11 shrink-0 rounded-full bg-gradient-to-br from-primary to-emerald-800 shadow-sm transition hover:opacity-95"
        >
          <SendIcon className="size-4" />
        </Button>
      </form>
    </div>
  )
}
