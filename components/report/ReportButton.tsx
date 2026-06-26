'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { FlagIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { submitReport } from '@/app/reports/actions'
import { REPORT_REASONS } from '@/lib/reports/reasons'

type Target = 'listing' | 'user'

const COPY: Record<Target, { trigger: string; title: string }> = {
  listing: { trigger: 'Report listing', title: 'Report this listing' },
  user: { trigger: 'Report user', title: 'Report this user' },
}

/** Reusable report modal for either a listing or a user. */
export function ReportButton({
  target,
  authed,
  listingId,
  reportedUserId,
  className,
}: {
  target: Target
  authed: boolean
  listingId?: string | null
  reportedUserId?: string | null
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const copy = COPY[target]

  function toLogin() {
    router.push(`/login?redirectTo=${encodeURIComponent(pathname)}`)
  }

  function onOpenChange(next: boolean) {
    if (next && !authed) {
      toLogin()
      return
    }
    setOpen(next)
  }

  async function submit() {
    if (!reason) {
      toast.error('Choose a reason.')
      return
    }
    setSubmitting(true)
    const res = await submitReport({ listingId, reportedUserId, reason, description })
    setSubmitting(false)

    if (res.needAuth) {
      toLogin()
    } else if (res.error) {
      toast.error(res.error)
    } else {
      setOpen(false)
      setReason('')
      setDescription('')
      toast.success('Report submitted. Thank you — our team will review it.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={className ?? 'text-muted-foreground hover:text-foreground'}
        >
          <FlagIcon className="size-4" />
          {copy.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            Tell us what&apos;s wrong. Your report is confidential.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-reason">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="report-reason" className="w-full">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-desc">Details (optional)</Label>
            <Textarea
              id="report-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Add any context that helps us review this…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !reason}>
            {submitting && <Loader2Icon className="size-4 animate-spin" />}
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
