'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CookieIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const KEY = 'qb:cookie-consent'

function Toggle({
  label,
  desc,
  checked,
  onChange,
  disabled,
}: {
  label: string
  desc: string
  checked: boolean
  onChange?: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60',
          checked ? 'bg-primary' : 'bg-muted',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}

export function CookieConsent() {
  const [show, setShow] = useState(false)
  const [manage, setManage] = useState(false)
  const [analytics, setAnalytics] = useState(true)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true)
    } catch {
      /* localStorage blocked → don't nag */
    }
  }, [])

  function save(c: { analytics: boolean; marketing: boolean }) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ necessary: true, ...c, ts: Date.now() }))
    } catch {
      /* ignore */
    }
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card/95 p-4 shadow-float backdrop-blur-xl sm:p-5">
        <div className="flex items-start gap-3">
          <CookieIcon className="mt-0.5 size-5 shrink-0 text-gold" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">We value your privacy</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We use necessary cookies to run Query &amp; Buy, and optional cookies to understand
              usage and improve the experience. Read our{' '}
              <Link href="/cookies" className="text-primary underline-offset-2 hover:underline">
                Cookie Policy
              </Link>
              .
            </p>

            {manage && (
              <div className="mt-3 divide-y divide-border border-t border-border pt-1">
                <Toggle label="Necessary" desc="Required for the site to function." checked disabled />
                <Toggle
                  label="Analytics"
                  desc="Helps us understand how the marketplace is used."
                  checked={analytics}
                  onChange={setAnalytics}
                />
                <Toggle
                  label="Marketing"
                  desc="Personalized promotions and recommendations."
                  checked={marketing}
                  onChange={setMarketing}
                />
              </div>
            )}

            <div className="mt-3.5 flex flex-wrap gap-2">
              <Button size="sm" className="rounded-full" onClick={() => save({ analytics: true, marketing: true })}>
                Accept all
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => save({ analytics: false, marketing: false })}
              >
                Reject optional
              </Button>
              {manage ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => save({ analytics, marketing })}
                >
                  Save preferences
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => setManage(true)}
                >
                  Manage preferences
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
