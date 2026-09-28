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

// Third-party hosts, per Google's CSP guide for the Google tag with Ads
// conversions + remarketing (developers.google.com/tag-platform/security/guides/csp)
// and Cloudflare Web Analytics. Before 2026-09-28 only the GA hosts were allowed,
// so the Ads tag (AW-18324447007) loaded but every conversion/remarketing hit was
// blocked. Google TLD hosts must be listed one by one; .ae covers UAE visitors.
const GOOGLE_ADS_SCRIPT = [
  'https://www.googleadservices.com',
  'https://www.google.com',
  // Observed: gtag loads viewthroughconversion from here (not in Google's list).
  'https://googleads.g.doubleclick.net',
]
const GOOGLE_ADS_COLLECT = [
  'https://www.googleadservices.com',
  'https://googleads.g.doubleclick.net',
  'https://pagead2.googlesyndication.com',
  'https://www.google.com',
  'https://www.google.ae',
  'https://ad.doubleclick.net',
]
const CLOUDFLARE_INSIGHTS_SCRIPT = 'https://static.cloudflareinsights.com'
const CLOUDFLARE_INSIGHTS_BEACON = 'https://cloudflareinsights.com'

const CSP = [
  "default-src 'self'",
  // Next.js dev evaluates modules and HMR updates via eval(), which a strict
  // script-src blocks — leaving the app server-rendered but never hydrated
  // (nothing interactive) during local development. 'unsafe-eval' is added in
  // dev only; the production CSP stays strict (no eval in production builds).
  // Google tag manager host is allowed so the GA4 / Google Ads gtag library
  // can load (without it the tags render but never fire).
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com ${GOOGLE_ADS_SCRIPT.join(' ')} ${CLOUDFLARE_INSIGHTS_SCRIPT}${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://avatars.queryandbuy.com https://images.queryandbuy.com https://lh3.googleusercontent.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com ${GOOGLE_ADS_COLLECT.join(' ')}`,
  "font-src 'self' data:",
  // google-analytics / googletagmanager endpoints are needed for GA4 + Ads to
  // send collection beacons (the actual analytics data).
  `connect-src 'self' https://*.r2.cloudflarestorage.com https://avatars.queryandbuy.com https://images.queryandbuy.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com ${GOOGLE_ADS_COLLECT.join(' ')} ${CLOUDFLARE_INSIGHTS_BEACON}${STORAGE_API_ORIGIN ? ` ${STORAGE_API_ORIGIN}` : ''}`,
  // Google's guide lists googletagmanager for frame-src when Ads features are on.
  'frame-src https://www.googletagmanager.com',
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
      { source: '/:path*', headers: SECURITY_HEADERS },
      // Apple universal-links file is extensionless — force the JSON type.
      {
        source: '/.well-known/apple-app-site-association',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
    ]
  },

  // Note: the www.queryandbuy.com → queryandbuy.com canonicalisation lives in
  // middleware.ts, which emits a classic 301 (Next's redirects() only supports
  // 307/308). Keeping it in one place avoids two competing host redirects.

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Dev only: the seeded demo data references Unsplash photos so the local
      // marketplace has real imagery to design against. Production serves from
      // R2 (relative keys) and never hits this.
      ...(isDev
        ? [{ protocol: 'https' as const, hostname: 'images.unsplash.com' }]
        : []),
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
