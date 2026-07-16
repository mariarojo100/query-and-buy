'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { resendVerificationAction } from '@/app/(auth)/verify-actions'

/** A 60s cooldown matches the server-side resend cooldown so the UI can't out-run it. */
const COOLDOWN_SEC = 60

export function ResendVerificationButton({
  label = 'Resend verification email',
  className,
}: {
  label?: string
  className?: string
}) {
  const [pending, startTransition] = useTransition()
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  function onClick() {
    startTransition(async () => {
      const res = await resendVerificationAction()
      if (res.ok) {
        toast.success('Verification email sent. Check your inbox.')
        setCooldown(COOLDOWN_SEC)
      } else {
        toast.error(res.error ?? 'Could not send the email.')
        if (res.retryAfterSec) setCooldown(Math.min(res.retryAfterSec, COOLDOWN_SEC))
      }
    })
  }

  const disabled = pending || cooldown > 0
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        className ??
        'rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60'
      }
    >
      {pending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : label}
    </button>
  )
}
