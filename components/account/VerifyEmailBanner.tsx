'use client'

import { useState, useTransition } from 'react'
import { MailWarningIcon, CheckCircle2Icon } from 'lucide-react'
import { resendVerificationEmail } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'

/**
 * Shown to a signed-in user whose email is not yet verified. Explains the state
 * and lets them re-send the verification link (e.g. if the signup email never
 * arrived). Rendered only when `email_verified` is false, so it disappears once
 * the /auth/confirm link is redeemed.
 */
export function VerifyEmailBanner({ email }: { email: string | null }) {
  const [pending, startTransition] = useTransition()
  const [state, setState] = useState<'idle' | 'sent' | 'error'>('idle')

  function resend() {
    startTransition(async () => {
      const res = await resendVerificationEmail()
      setState(res.ok ? 'sent' : 'error')
    })
  }

  const verifiedEmail = email ? (
    <span className="font-medium text-foreground">{email}</span>
  ) : (
    'your email address'
  )

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gold/40 bg-gold/[0.07] p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-start gap-3">
        {state === 'sent' ? (
          <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
        ) : (
          <MailWarningIcon className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {state === 'sent' ? 'Verification email sent' : 'Verify your email address'}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground" aria-live="polite">
            {state === 'sent' ? (
              <>
                We’ve sent a fresh link to {verifiedEmail}. Open it to confirm your account — check
                spam if it’s not there in a minute.
              </>
            ) : state === 'error' ? (
              <>Something went wrong sending the email. Please try again in a moment.</>
            ) : (
              <>Confirm {verifiedEmail} to build trust with buyers and secure your account.</>
            )}
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={resend}
        disabled={pending || state === 'sent'}
        className="shrink-0 self-start sm:self-auto"
      >
        {pending ? 'Sending…' : state === 'sent' ? 'Sent' : 'Resend email'}
      </Button>
    </div>
  )
}
