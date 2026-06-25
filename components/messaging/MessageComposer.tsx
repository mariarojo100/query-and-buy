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
    <div className="border-t p-3">
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
          className="max-h-32 min-h-10 flex-1 resize-none"
          aria-label="Message"
        />
        <Button type="submit" size="icon" disabled={pending || !text.trim()} aria-label="Send">
          <SendIcon className="size-4" />
        </Button>
      </form>
    </div>
  )
}
