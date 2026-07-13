import type { NextConfig } from 'next'

/**
 * Content-Security-Policy. This is the strictest policy that is fully
 * compatible with the Next.js 15 App Router WITHOUT per-request nonces:
 * Next injects inline bootstrap scripts and inline <style> tags, and we emit
 * inline JSON-LD, so 'unsafe-inline' is required for script/style until a
 * nonce-based middleware CSP is adopted (tracked in PRODUCTION_READINESS.md).
 *
 * - img-src allows https: (next/image proxies most, but Radix avatars load
 *   Google/Supabase URLs directly) plus data:/blob: for upload previews.
 * - connect-src allows Supabase (still live) + the S3-compatible storage host
 *   for presigned PUT uploads during/after the migration. Gemini is server-side
 *   only, so it is intentionally NOT in connect-src.
 */
const STORAGE_ORIGIN = (() => {
  try {
    return process.env.NEXT_PUBLIC_STORAGE_BASE_URL ? new URL(process.env.NEXT_PUBLIC_STORAGE_BASE_URL).origin : ''
  } catch {
    return ''
  }
})()

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${STORAGE_ORIGIN ? ` ${STORAGE_ORIGIN}` : ''}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ')

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
]

const nextConfig: NextConfig = {
  // Don't leak the framework/version in responses.
  poweredByHeader: false,
  // Trim a little client JS by transpiling icon imports to per-icon modules.
  experimental: {
    optimizePackageImports: ['lucide-react'],
    serverActions: { bodySizeLimit: '10mb' },
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
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Supabase Storage public objects (avatars, listing-images) — still live pre-cutover.
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/object/public/**' },
      // Target S3-compatible storage host (R2/S3/MinIO) — active once NEXT_PUBLIC_STORAGE_BASE_URL is set.
      ...(STORAGE_ORIGIN ? [{ protocol: 'https' as const, hostname: new URL(STORAGE_ORIGIN).hostname }] : []),
      // Google account avatars from OAuth sign-in.
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
}

export default nextConfig
