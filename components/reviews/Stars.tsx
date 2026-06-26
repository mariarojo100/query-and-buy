import { StarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Read-only star display, filled to the rounded value. */
export function Stars({
  value,
  size = 'size-4',
  className,
}: {
  value: number
  size?: string
  className?: string
}) {
  const filled = Math.round(value)
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon
          key={i}
          className={cn(size, i <= filled ? 'fill-gold text-gold' : 'text-muted-foreground/30')}
        />
      ))}
    </span>
  )
}
