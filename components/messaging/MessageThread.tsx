'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { formatChatTime } from '@/lib/format'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/components/profile/ProfileHeader'
import type { ConversationMessage } from '@/lib/messaging/queries'

export function MessageThread({
  messages,
  meId,
  otherName,
  otherAvatarUrl,
}: {
  messages: ConversationMessage[]
  meId: string
  otherName: string
  otherAvatarUrl?: string | null
}) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to newest on load and whenever a message is added.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
      {messages.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No messages yet. Say hello 👋
        </p>
      ) : (
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {messages.map((m, i) => {
            const mine = m.sender_id === meId
            const showAvatar = !mine && messages[i + 1]?.sender_id !== m.sender_id
            return (
              <div
                key={m.id}
                className={cn('flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}
              >
                {!mine &&
                  (showAvatar ? (
                    <Avatar className="size-7">
                      <AvatarImage src={otherAvatarUrl ?? undefined} alt={otherName} />
                      <AvatarFallback className="text-[10px]">
                        {initials(otherName)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <span className="w-7 shrink-0" />
                  ))}

                <div className={cn('flex max-w-[78%] flex-col', mine ? 'items-end' : 'items-start')}>
                  <div
                    className={cn(
                      'whitespace-pre-wrap break-words px-4 py-2.5 text-sm leading-relaxed shadow-sm',
                      mine
                        ? 'rounded-2xl rounded-br-md bg-primary text-primary-foreground'
                        : 'rounded-2xl rounded-bl-md border border-border bg-card',
                    )}
                  >
                    {m.body}
                  </div>
                  <span className="mt-1 px-1 text-[11px] text-muted-foreground">
                    {formatChatTime(m.created_at)}
                  </span>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
