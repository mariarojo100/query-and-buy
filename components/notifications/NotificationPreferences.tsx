'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { updateNotificationPreferences } from '@/app/notifications/actions'
import type { NotificationPrefs } from '@/lib/notifications/preferences'

const ROWS: { key: keyof NotificationPrefs; label: string; desc: string }[] = [
  { key: 'offer_emails', label: 'Offers', desc: 'New offers, counters, and accepted offers' },
  { key: 'chat_emails', label: 'Chat', desc: 'New message notifications' },
  { key: 'order_emails', label: 'Orders', desc: 'Confirmations, sales, and reservation updates' },
  { key: 'review_emails', label: 'Reviews', desc: 'When someone leaves you a review' },
  { key: 'marketing_emails', label: 'Marketing', desc: 'Product news and occasional tips' },
]

export function NotificationPreferences({ initial }: { initial: NotificationPrefs }) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(initial)
  const [pending, start] = useTransition()

  function toggle(key: keyof NotificationPrefs) {
    const prev = prefs
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    start(async () => {
      const res = await updateNotificationPreferences(next)
      if (res.error) {
        setPrefs(prev)
        toast.error('Could not save your preference.')
      } else {
        toast.success('Preferences saved')
      }
    })
  }

  return (
    <div className="divide-y divide-border">
      {ROWS.map((r) => (
        <div key={r.key} className="flex items-center justify-between gap-4 py-3.5">
          <div className="min-w-0">
            <p className="text-sm font-medium">{r.label}</p>
            <p className="text-xs text-muted-foreground">{r.desc}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs[r.key]}
            aria-label={`${r.label} emails`}
            disabled={pending}
            onClick={() => toggle(r.key)}
            className={cn(
              'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60',
              prefs[r.key] ? 'bg-primary' : 'bg-muted',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform',
                prefs[r.key] ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
              )}
            />
          </button>
        </div>
      ))}
      <p className="pt-3.5 text-xs text-muted-foreground">
        Critical transaction emails (order confirmed, contact details unlocked, reservation updates)
        are always sent for your account safety.
      </p>
    </div>
  )
}
