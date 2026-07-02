'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'
import { updatePassword, type AuthState } from '@/app/(auth)/actions'

const inputClass =
  'rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm font-normal outline-none transition focus:border-gold/50 focus:ring-1 focus:ring-gold/30'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-gray-900 px-4 py-2.5 font-medium text-white hover:bg-gray-800 disabled:opacity-60"
    >
      {pending ? 'Please wait…' : 'Update password'}
    </button>
  )
}

export default function ResetPasswordPage() {
  const [state, formAction] = useActionState<AuthState, FormData>(updatePassword, null)

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-7 px-6 py-12">
      <div className="text-center">
        <Link href="/" aria-label="Query & Buy home" className="inline-flex justify-center">
          <Logo size={44} />
        </Link>
        <h1 className="font-display mt-7 text-3xl tracking-tight">Choose a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter a new password for your account. Minimum 8 characters.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          New password
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
        </label>

        {state?.error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-foreground underline decoration-gold underline-offset-4"
        >
          Back to log in
        </Link>
      </p>
    </main>
  )
}
