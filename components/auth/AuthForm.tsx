'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
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

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">{copy.title}</h1>

      {message && (
        <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
          {message}
        </p>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded-md border border-gray-300 px-3 py-2 font-normal"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Password
          <input
            type="password"
            name="password"
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="rounded-md border border-gray-300 px-3 py-2 font-normal"
          />
        </label>

        {state?.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <SubmitButton label={copy.submit} />
      </form>

      <p className="text-center text-sm text-gray-600">
        {copy.altText}{' '}
        <Link href={copy.altHref} className="font-medium text-gray-900 underline">
          {copy.altLabel}
        </Link>
      </p>
    </main>
  )
}
