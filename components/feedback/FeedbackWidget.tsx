'use client'

import { useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import { MessageSquarePlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { submitFeedback } from '@/app/feedback/actions'

const KINDS = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'general', label: 'General' },
] as const

export function FeedbackWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<(typeof KINDS)[number]['value']>('general')
  const [message, setMessage] = useState('')
  const [pending, start] = useTransition()

  function submit() {
    const text = message.trim()
    if (!text) {
      toast.error('Please enter a message.')
      return
    }
    start(async () => {
      const res = await submitFeedback({
        kind,
        message: text,
        path: pathname,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      })
      if (res.error) toast.error(res.error)
      else {
        toast.success('Thanks — your feedback was sent!')
        setMessage('')
        setKind('general')
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label="Send feedback"
          className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-float transition hover:border-gold/40 hover:shadow-soft sm:bottom-6 sm:right-6"
        >
          <MessageSquarePlusIcon className="size-4 text-primary" />
          <span className="hidden sm:inline">Feedback</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-normal">Share feedback</DialogTitle>
          <DialogDescription>
            Query &amp; Buy is in beta — tell us what&apos;s broken, what&apos;s missing, or what you
            love.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Feedback type">
            {KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                role="radio"
                aria-checked={kind === k.value}
                onClick={() => setKind(k.value)}
                className={cn(
                  'rounded-xl border px-3 py-2 text-sm transition',
                  kind === k.value
                    ? 'border-transparent bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {k.label}
              </button>
            ))}
          </div>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder={
              kind === 'bug'
                ? 'What happened, and what did you expect?'
                : kind === 'feature'
                  ? 'What would you like Query & Buy to do?'
                  : 'Share your thoughts…'
            }
            className="resize-none rounded-xl"
            aria-label="Your feedback"
          />

          <Button onClick={submit} disabled={pending || !message.trim()} className="w-full rounded-full">
            {pending ? 'Sending…' : 'Send feedback'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
