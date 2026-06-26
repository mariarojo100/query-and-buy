'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app:global-error]', { message: error.message, digest: error.digest })
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
          background: '#fafaf8',
          color: '#28332c',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '24px', margin: '0 0 8px' }}>Something went wrong</h1>
        <p style={{ color: '#6b746f', margin: '0 0 20px' }}>
          The app ran into an unexpected error. Please try again.
        </p>
        <button
          onClick={reset}
          style={{
            background: '#2f6f57',
            color: '#fff',
            border: 'none',
            borderRadius: '999px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
