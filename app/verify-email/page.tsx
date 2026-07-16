import Link from 'next/link'
import type { ReactNode } from 'react'
import { CheckCircle2, MailCheck, Clock, XCircle } from 'lucide-react'
import { getViewer } from '@/lib/auth/session'
import { getVerificationState } from '@/lib/db/auth'
import { verifyEmail } from '@/lib/auth/email-verify'
import { Logo } from '@/components/brand/Logo'
import { ResendVerificationButton } from '@/components/auth/ResendVerificationButton'
import { ChangeEmailForm } from '@/components/auth/ChangeEmailForm'

// The token is single-use and redeemed on load — never cache this route.
export const dynamic = 'force-dynamic'

type Status = 'success' | 'already_verified' | 'expired' | 'invalid' | 'check_inbox'

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  let status: Status
  if (token) {
    const outcome = await verifyEmail(token)
    status = outcome.status === 'ok' ? 'success' : outcome.status
  } else {
    status = 'check_inbox'
  }

  // For the no-token (check inbox) view, surface the signed-in email + controls.
  const viewer = status === 'check_inbox' ? await getViewer() : null
  const state = viewer ? await getVerificationState(viewer.id) : null
  if (status === 'check_inbox' && state?.emailVerified) status = 'already_verified'
  const email = state?.email ?? null

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-7 px-6 py-12 text-center">
      <Link href="/" aria-label="Query & Buy home" className="inline-flex justify-center">
        <Logo size={44} />
      </Link>
      {renderStatus(status, email)}
    </main>
  )
}

function Shell({
  icon,
  tone,
  title,
  description,
  children,
}: {
  icon: ReactNode
  tone: 'good' | 'warn' | 'bad'
  title: string
  description: string
  children?: ReactNode
}) {
  const ring =
    tone === 'good'
      ? 'bg-emerald-50 text-emerald-600'
      : tone === 'warn'
        ? 'bg-amber-50 text-amber-600'
        : 'bg-destructive/10 text-destructive'
  return (
    <div className="flex flex-col items-center gap-5">
      <span className={`inline-flex h-14 w-14 items-center justify-center rounded-full ${ring}`}>
        {icon}
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children && <div className="flex w-full flex-col items-center gap-3">{children}</div>}
    </div>
  )
}

function GoToAccount() {
  return (
    <Link
      href="/account"
      className="rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
    >
      Go to your account
    </Link>
  )
}

function renderStatus(status: Status, email: string | null): ReactNode {
  switch (status) {
    case 'success':
      return (
        <Shell
          tone="good"
          icon={<CheckCircle2 className="h-7 w-7" />}
          title="Email verified"
          description="Your email address is confirmed. You’re all set."
        >
          <GoToAccount />
        </Shell>
      )
    case 'already_verified':
      return (
        <Shell
          tone="good"
          icon={<CheckCircle2 className="h-7 w-7" />}
          title="Already verified"
          description="This email address has already been confirmed."
        >
          <GoToAccount />
        </Shell>
      )
    case 'expired':
      return (
        <Shell
          tone="warn"
          icon={<Clock className="h-7 w-7" />}
          title="Link expired"
          description="Verification links are valid for 24 hours. Request a fresh one below."
        >
          <ResendVerificationButton label="Send a new link" />
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Back to login
          </Link>
        </Shell>
      )
    case 'invalid':
      return (
        <Shell
          tone="bad"
          icon={<XCircle className="h-7 w-7" />}
          title="Invalid link"
          description="This verification link isn’t valid. It may have already been used. If you’re signed in, request a new one."
        >
          <ResendVerificationButton label="Send a new link" />
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Back to login
          </Link>
        </Shell>
      )
    case 'check_inbox':
    default:
      return (
        <Shell
          tone="warn"
          icon={<MailCheck className="h-7 w-7" />}
          title="Check your inbox"
          description={
            email
              ? `We sent a verification link to ${email}. Click it to confirm your address.`
              : 'We sent you a verification link. Click it to confirm your email address.'
          }
        >
          <ResendVerificationButton />
          <ChangeEmailForm currentEmail={email} />
        </Shell>
      )
  }
}
