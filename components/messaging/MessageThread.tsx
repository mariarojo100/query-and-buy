'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { formatChatTime } from '@/lib/format'
import type { ConversationMessage } from '@/lib/messaging/queries'

export function MessageThread({
  messages,
  meId,
  otherName,
}: {
  messages: ConversationMessage[]
  meId: string
  otherName: string
}) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to newest on load and whenever a message is added.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {messages.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No messages yet. Say hello 👋
        </p>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => {
            const mine = m.sender_id === meId
            return (
              <div key={m.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm',
                    mine ? 'bg-primary text-primary-foreground' : 'bg-muted',
                  )}
                >
                  {m.body}
                </div>
                <span className="mt-1 px-1 text-[11px] text-muted-foreground">
                  {mine ? 'You' : otherName} · {formatChatTime(m.created_at)}
                </span>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
