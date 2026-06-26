'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { StarIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { submitReview } from '@/app/reviews/actions'

export function ReviewForm({
  orderId,
  revieweeName,
  onDone,
}: {
  orderId: string
  revieweeName: string
  onDone?: () => void
}) {
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState('')
  const [pending, start] = useTransition()

  function submit() {
    if (!rating) {
      toast.error('Pick a star rating first.')
      return
    }
    start(async () => {
      const res = await submitReview({ orderId, rating, text })
      if (res.error) toast.error(res.error)
      else {
        toast.success('Thanks for your review!')
        onDone ? onDone() : router.refresh()
      }
    })
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-sm font-semibold">Rate your experience with {revieweeName}</p>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(i)}
            className="p-0.5 transition-transform hover:scale-110"
            aria-label={`${i} star${i > 1 ? 's' : ''}`}
          >
            <StarIcon
              className={cn(
                'size-7 transition-colors',
                (hover || rating) >= i ? 'fill-gold text-gold' : 'text-muted-foreground/30',
              )}
            />
          </button>
        ))}
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Share a few words about the transaction (optional)"
        className="mt-3 resize-none rounded-xl bg-background"
      />
      <div className="mt-3">
        <Button size="sm" className="rounded-full" disabled={pending} onClick={submit}>
          Submit review
        </Button>
      </div>
    </div>
  )
}
