'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { changeEmailAction } from '@/app/(auth)/verify-actions'

/**
 * Change the email of an as-yet-unverified account, then a fresh link is sent
 * to the new address. Used on the check-inbox page and in account settings.
 */
export function ChangeEmailForm({ currentEmail }: { currentEmail?: string | null }) {
  const [pending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [open, setOpen] = useState(false)

  const inputClass =
    'rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm outline-none transition focus:border-gold/50 focus:ring-1 focus:ring-gold/30'

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-muted-foreground underline decoration-gold underline-offset-4 transition hover:text-foreground"
      >
        Entered the wrong email? Change it
      </button>
    )
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await changeEmailAction(email.trim())
      if (res.ok) {
        toast.success('Email updated. We sent a new verification link.')
        setOpen(false)
        setEmail('')
      } else {
        toast.error(res.error ?? 'Could not update your email.')
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-2">
      <label className="flex flex-col gap-1.5 text-left text-sm font-medium">
        New email address
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={currentEmail ?? 'you@example.com'}
          className={inputClass}
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Update & resend'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-input px-4 py-2.5 text-sm font-medium transition hover:bg-accent"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
