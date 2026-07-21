'use client'

import { useState } from 'react'
import { CheckIcon, Share2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ShareProfileButton({
  username,
  onDark = false,
}: {
  username: string | null
  /** Style for placement on the dark ink banner. */
  onDark?: boolean
}) {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/u/${username ?? ''}`
        : `/u/${username ?? ''}`
    if (!username) {
      toast.error('Set a username first to share your profile.')
      return
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My Query & Buy profile', url })
        return
      }
    } catch {
      /* user cancelled share sheet — fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Profile link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy link.')
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        'rounded-full',
        onDark &&
          'border-primary-foreground/25 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground',
      )}
      onClick={share}
    >
      {copied ? <CheckIcon className="size-4" /> : <Share2Icon className="size-4" />}
      Share
    </Button>
  )
}
