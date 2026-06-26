'use client'

import { useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { HeartIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { toggleFavorite } from '@/app/favorites/actions'

export function FavoriteButton({
  listingId,
  initialFavorited,
  authed,
  className,
  iconClassName,
}: {
  listingId: string
  initialFavorited: boolean
  authed: boolean
  className?: string
  iconClassName?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [fav, setFav] = useState(initialFavorited)
  const [pending, startTransition] = useTransition()

  function toLogin() {
    router.push(`/login?redirectTo=${encodeURIComponent(pathname)}`)
  }

  function onClick(e: React.MouseEvent) {
    // Hearts often sit inside a card <Link> — don't navigate the card.
    e.preventDefault()
    e.stopPropagation()
    if (!authed) return toLogin()

    const next = !fav
    setFav(next) // optimistic
    startTransition(async () => {
      const res = await toggleFavorite(listingId)
      if (res.needAuth) {
        setFav(!next)
        toLogin()
      } else if (res.error) {
        setFav(!next)
        toast.error(res.error)
      } else {
        setFav(!!res.favorited)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={fav}
      aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
      className={cn('inline-flex items-center justify-center transition', className)}
    >
      <HeartIcon
        className={cn('size-5', fav ? 'fill-foreground text-foreground' : '', iconClassName)}
      />
    </button>
  )
}
