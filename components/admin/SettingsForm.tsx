'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateSettings } from '@/app/admin/actions'
import type { MarketplaceSettings } from '@/lib/admin/queries'

export function SettingsForm({ initial }: { initial: MarketplaceSettings }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [name, setName] = useState(initial.marketplace_name)
  const [contact, setContact] = useState(initial.contact_email ?? '')
  const [support, setSupport] = useState(initial.support_email ?? '')
  const [terms, setTerms] = useState(initial.terms_url ?? '')
  const [privacy, setPrivacy] = useState(initial.privacy_url ?? '')
  const [maintenance, setMaintenance] = useState(initial.maintenance_mode)

  function save() {
    start(async () => {
      const r = await updateSettings({
        marketplace_name: name,
        contact_email: contact,
        support_email: support,
        terms_url: terms,
        privacy_url: privacy,
        maintenance_mode: maintenance,
      })
      if (r.error) toast.error(r.error)
      else {
        toast.success('Settings saved')
        router.refresh()
      }
    })
  }

  return (
    <div className="max-w-xl space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div>
        <Label className="text-xs">Marketplace name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Contact email</Label>
        <Input type="email" value={contact} onChange={(e) => setContact(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Support email</Label>
        <Input type="email" value={support} onChange={(e) => setSupport(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Terms URL</Label>
        <Input value={terms} onChange={(e) => setTerms(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Privacy URL</Label>
        <Input value={privacy} onChange={(e) => setPrivacy(e.target.value)} className="mt-1" />
      </div>
      <div className="flex items-center justify-between border-t border-border pt-4">
        <div>
          <p className="text-sm font-medium">Maintenance mode</p>
          <p className="text-xs text-muted-foreground">Temporarily restrict the marketplace.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={maintenance}
          onClick={() => setMaintenance((v) => !v)}
          className={cn(
            'relative h-6 w-11 shrink-0 rounded-full transition-colors',
            maintenance ? 'bg-destructive' : 'bg-muted',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform',
              maintenance ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
            )}
          />
        </button>
      </div>
      <Button disabled={pending} onClick={save} className="rounded-full">
        Save settings
      </Button>
      <p className="text-xs text-muted-foreground">
        Logo, brand colours, social links, and AI moderation thresholds are stored in settings and
        surfaced here as they get wired into the public UI.
      </p>
    </div>
  )
}
