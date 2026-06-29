'use client'

import { useState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  )
}

export function GoogleSignInButton({ next }: { next?: string }) {
  const [loading, setLoading] = useState(false)

  async function signIn() {
    if (loading) return
    setLoading(true)
    try {
      // Send the user to the page they originally wanted (?redirectTo) or home.
      const redirectTo = new URLSearchParams(window.location.search).get('redirectTo')
      const target = next ?? (redirectTo && redirectTo.startsWith('/') ? redirectTo : '/')
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`,
        },
      })
      if (error) {
        toast.error('Could not start Google sign-in. Please try again.')
        setLoading(false)
      }
      // On success the browser redirects to Google — keep the spinner showing.
    } catch {
      toast.error('Network error. Check your connection and try again.')
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={loading}
      aria-label="Continue with Google"
      className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-input bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? (
        <Loader2Icon className="size-4 animate-spin text-neutral-500" />
      ) : (
        <GoogleIcon className="size-4" />
      )}
      {loading ? 'Connecting…' : 'Continue with Google'}
    </button>
  )
}
