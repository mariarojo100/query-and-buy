import { CheckCircle2, AlertCircle } from 'lucide-react'
import { ResendVerificationButton } from '@/components/auth/ResendVerificationButton'
import { ChangeEmailForm } from '@/components/auth/ChangeEmailForm'
import { PhoneVerification } from '@/components/profile/PhoneVerification'

/**
 * Account-settings verification block. Email and phone are INDEPENDENT concepts
 * and are shown as separate rows — one being verified says nothing about the
 * other. Deliberately no "Verified Seller" wording anywhere.
 */
export function VerificationSection({
  email,
  emailVerified,
  phoneE164,
  phoneVerified,
}: {
  email: string | null
  emailVerified: boolean
  phoneE164: string | null
  phoneVerified: boolean
}) {
  return (
    <div className="divide-y divide-border">
      {/* Email */}
      <div className="flex flex-col gap-3 pb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Email address</p>
            <p className="truncate text-sm text-muted-foreground">{email ?? '—'}</p>
          </div>
          <StatusPill verified={emailVerified} />
        </div>
        {!emailVerified && (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">
              Confirm your email to secure your account and receive important notifications.
            </p>
            <ResendVerificationButton label="Send verification email" />
            <ChangeEmailForm currentEmail={email} />
          </div>
        )}
      </div>

      {/* Phone */}
      <div className="flex flex-col gap-3 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Phone number</p>
            <p className="truncate text-sm text-muted-foreground">{phoneE164 ?? 'Not added'}</p>
          </div>
          <StatusPill verified={phoneVerified} />
        </div>
        <PhoneVerification verified={phoneVerified} currentPhone={phoneE164} />
      </div>
    </div>
  )
}

function StatusPill({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
      <CheckCircle2 className="size-3.5" aria-hidden />
      Verified
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
      <AlertCircle className="size-3.5" aria-hidden />
      Unverified
    </span>
  )
}
