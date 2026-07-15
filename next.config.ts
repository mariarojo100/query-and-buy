import type { NextConfig } from 'next'

const STORAGE_API_ORIGIN = (() => {
  try {
    return process.env.STORAGE_ENDPOINT
      ? new URL(process.env.STORAGE_ENDPOINT).origin
      : ''
  } catch {
    return ''
  }
})()

const isDev = process.env.NODE_ENV !== 'production'

const CSP = [
  "default-src 'self'",
  // Next.js dev evaluates modules and HMR updates via eval(), which a strict
  // script-src blocks — leaving the app server-rendered but never hydrated
  // (nothing interactive) during local development. 'unsafe-eval' is added in
  // dev only; the production CSP stays strict (no eval in production builds).
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://avatars.queryandbuy.com https://images.queryandbuy.com https://lh3.googleusercontent.com",
  "font-src 'self' data:",
  `connect-src 'self' https://*.r2.cloudflarestorage.com https://avatars.queryandbuy.com https://images.queryandbuy.com${STORAGE_API_ORIGIN ? ` ${STORAGE_API_ORIGIN}` : ''}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // "upgrade-insecure-requests",
].join('; ')

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,

  experimental: {
    optimizePackageImports: ['lucide-react'],
    serverActions: {
      bodySizeLimit: '10mb',
    },
    authInterrupts: true,
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
    ]
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.queryandbuy.com',
      },
      {
        protocol: 'https',
        hostname: 'images.queryandbuy.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
}

export default nextConfig
