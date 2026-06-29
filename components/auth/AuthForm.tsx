'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import type { AuthState } from '@/app/(auth)/actions'

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-gray-900 px-4 py-2.5 font-medium text-white hover:bg-gray-800 disabled:opacity-60"
    >
      {pending ? 'Please wait…' : label}
    </button>
  )
}

type Mode = 'login' | 'signup'

const COPY: Record<
  Mode,
  { title: string; submit: string; altText: string; altHref: string; altLabel: string }
> = {
  login: {
    title: 'Log in',
    submit: 'Log in',
    altText: 'Need an account?',
    altHref: '/signup',
    altLabel: 'Sign up',
  },
  signup: {
    title: 'Create your account',
    submit: 'Sign up',
    altText: 'Already have an account?',
    altHref: '/login',
    altLabel: 'Log in',
  },
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
  const copy = COPY[mode]

  const inputClass =
    'rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm font-normal outline-none transition focus:border-gold/50 focus:ring-1 focus:ring-gold/30'

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-7 px-6 py-12">
      <div className="text-center">
        <Link href="/" className="font-display text-2xl tracking-tight">
          Query <span className="text-muted-foreground">&amp;</span> Buy
        </Link>
        <h1 className="font-display mt-7 text-3xl tracking-tight">{copy.title}</h1>
      </div>

      {message && (
        <p className="rounded-lg border border-border bg-accent/40 px-3 py-2 text-sm">{message}</p>
      )}

      <div className="flex flex-col gap-4">
        <GoogleSignInButton />

        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            or
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email
          <input type="email" name="email" required autoComplete="email" className={inputClass} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Password
          <input
            type="password"
            name="password"
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className={inputClass}
          />
        </label>

        {state?.error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}

        <SubmitButton label={copy.submit} />
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {copy.altText}{' '}
        <Link
          href={copy.altHref}
          className="font-medium text-foreground underline decoration-gold underline-offset-4"
        >
          {copy.altLabel}
        </Link>
      </p>
    </main>
  )
}
