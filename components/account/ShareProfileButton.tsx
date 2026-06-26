'use client'

import { useState } from 'react'
import { CheckIcon, Share2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function ShareProfileButton({ username }: { username: string | null }) {
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
    <Button variant="outline" size="sm" className="rounded-full" onClick={share}>
      {copied ? <CheckIcon className="size-4" /> : <Share2Icon className="size-4" />}
      Share
    </Button>
  )
}
