import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage public objects (avatars, listing-images).
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
  experimental: {
    // AI generation posts downscaled base64 photos to a server action.
    serverActions: { bodySizeLimit: '10mb' },
  },
}

export default nextConfig
