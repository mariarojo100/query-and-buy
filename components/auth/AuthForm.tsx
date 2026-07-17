'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ChevronRightIcon,
  EyeIcon,
  EyeOffIcon,
  HeadphonesIcon,
  LockIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  TagIcon,
  type LucideIcon,
} from 'lucide-react'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { Logo, LogoMark } from '@/components/brand/Logo'
import type { AuthState } from '@/app/(auth)/actions'

type Mode = 'login' | 'signup'

const COPY: Record<
  Mode,
  {
    heading: string
    sub: string
    submit: string
    altText: string
    altHref: string
    altLabel: string
    showForgot: boolean
    showPhone: boolean
  }
> = {
  login: {
    heading: 'Welcome back',
    sub: 'Log in to continue to Query & Buy',
    submit: 'Log in',
    altText: 'New here?',
    altHref: '/signup',
    altLabel: 'Create account',
    showForgot: true,
    showPhone: true,
  },
  signup: {
    heading: 'Create your account',
    sub: 'Join Query & Buy to buy and sell across the UAE',
    submit: 'Create account',
    altText: 'Have an account?',
    altHref: '/login',
    altLabel: 'Log in',
    showForgot: false,
    showPhone: false,
  },
}

const FEATURES: { icon: LucideIcon; title: string; sub: string }[] = [
  { icon: ShieldCheckIcon, title: 'Safe & trusted', sub: 'Verified users and secure conversations' },
  { icon: TagIcon, title: 'Great deals', sub: 'Quality items at fair prices' },
  { icon: MapPinIcon, title: 'Local & convenient', sub: 'Find items near you across the UAE' },
]

const TRUST: { icon: LucideIcon; title: string; sub: string }[] = [
  { icon: ShieldCheckIcon, title: '100% Secure', sub: 'Your data is protected' },
  { icon: RotateCcwIcon, title: 'Easy Returns', sub: 'Hassle-free experience' },
  { icon: HeadphonesIcon, title: '24/7 Support', sub: 'We’re here to help' },
]

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-[background-color,transform] hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? 'Please wait…' : label}
    </button>
  )
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">or</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

export function AuthForm({
  mode,
  action,
  message,
}: {
  mode: Mode
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>
  message?: string
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(action, null)
  const [showPw, setShowPw] = useState(false)
  const copy = COPY[mode]
  const year = new Date().getFullYear()

  const fieldClass =
    'w-full rounded-xl border border-input bg-card py-3 pl-10 pr-3.5 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-gold/50 focus:ring-1 focus:ring-gold/30'

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,42%)_1fr]">
      {/* ---------- Left · brand ---------- */}
      <aside className="relative hidden overflow-hidden bg-background lg:flex lg:flex-col lg:justify-between">
        <div className="px-10 pt-10 xl:px-14">
          <Link href="/" aria-label="Query & Buy home" className="inline-flex">
            <Logo size={34} />
          </Link>

          <div className="mt-16 max-w-md">
            <h2 className="font-display text-4xl leading-[1.08] tracking-tight xl:text-5xl">
              Your marketplace for pre-owned things that <span className="text-gold">matter.</span>
            </h2>
            <p className="mt-5 max-w-sm text-base leading-relaxed text-muted-foreground">
              Buy and sell quality pre-owned items across the UAE with trust and ease.
            </p>

            <ul className="mt-10 space-y-5">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex items-start gap-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-gold shadow-soft">
                    <f.icon className="size-5" />
                  </span>
                  <div>
                    <p className="font-medium leading-tight">{f.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{f.sub}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Branded arch composition (stands in for a hero photo). */}
        <div className="relative mt-10 h-56 xl:h-64">
          <div className="absolute inset-x-10 -bottom-4 top-4 overflow-hidden rounded-t-[16rem] border border-border/70 bg-gradient-to-br from-secondary via-accent to-background">
            <div className="absolute -right-10 top-6 size-52 rounded-full bg-gold/15 blur-2xl" />
            <div className="absolute -left-6 bottom-0 size-40 rounded-full bg-primary/5 blur-2xl" />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-[0.12]">
              <LogoMark size={132} className="text-primary" />
            </div>
          </div>
        </div>
      </aside>

      {/* ---------- Right · form ---------- */}
      <section className="flex min-h-screen flex-col bg-card px-6 py-6 sm:px-10 lg:py-8">
        <div className="flex items-center gap-4">
          <Link href="/" aria-label="Query & Buy home" className="lg:hidden">
            <Logo size={30} />
          </Link>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{copy.altText}</span>
            <Link
              href={copy.altHref}
              className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {copy.altLabel}
            </Link>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-soft sm:p-9">
            <div className="text-center">
              <h1 className="font-display text-3xl tracking-tight">{copy.heading}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{copy.sub}</p>
            </div>

            <div className="mt-7">
              <GoogleSignInButton />
            </div>

            <Divider />

            {message && (
              <p className="mb-4 rounded-lg border border-border bg-accent/40 px-3 py-2 text-sm">
                {message}
              </p>
            )}

            <form action={formAction} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Email address</span>
                <div className="relative">
                  <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="Enter your email"
                    className={fieldClass}
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Password</span>
                <div className="relative">
                  <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    name="password"
                    required
                    minLength={6}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder="Enter your password"
                    className={`${fieldClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPw ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                  </button>
                </div>
              </label>

              {copy.showForgot && (
                <div className="-mt-1 text-right">
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-gold transition-colors hover:text-gold/80"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}

              {state?.error && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {state.error}
                </p>
              )}

              <SubmitButton label={copy.submit} />
            </form>

            {copy.showPhone && (
              <>
                <Divider />
                <button
                  type="button"
                  onClick={() => toast('Phone number login is coming soon.')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors hover:bg-accent/60"
                >
                  <PhoneIcon className="size-4 text-gold" />
                  Log in with phone number
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                </button>
              </>
            )}
          </div>
        </div>

        <footer className="mt-auto">
          <div className="grid grid-cols-1 gap-4 border-t border-border pt-6 sm:grid-cols-3">
            {TRUST.map((t) => (
              <div key={t.title} className="flex items-center gap-2.5">
                <t.icon className="size-5 shrink-0 text-gold" />
                <div>
                  <p className="text-sm font-medium leading-tight">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.sub}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {year} Query &amp; Buy. All rights reserved. &nbsp;·&nbsp;{' '}
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>{' '}
            &nbsp;·&nbsp;{' '}
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>{' '}
            &nbsp;·&nbsp;{' '}
            <Link href="/help" className="hover:text-foreground">
              Help
            </Link>
          </p>
        </footer>
      </section>
    </main>
  )
}
