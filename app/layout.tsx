import type { Metadata } from 'next'
import './globals.css'
import { Geist, Fraunces } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { CookieConsent } from "@/components/consent/CookieConsent";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import { JsonLd } from "@/components/seo/JsonLd";
import { GoogleAds } from "@/components/analytics/GoogleAds";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '500', '600'],
  style: ['normal'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Query & Buy — AI marketplace for the UAE',
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'UAE marketplace',
    'buy and sell UAE',
    'Dubai classifieds',
    'Abu Dhabi marketplace',
    'sell online UAE',
    'AI marketplace',
  ],
  authors: [{ name: SITE_NAME }],
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  // Explicit icon set so crawlers and iOS home-screen see a declared favicon /
  // apple-touch-icon (the SVG mark doubles for both). app/opengraph-image.tsx
  // separately supplies og:image + twitter:image for every route.
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: 'Query & Buy — AI marketplace for the UAE',
    description: SITE_DESCRIPTION,
    // No `url` here on purpose: a root-level og:url would leak the homepage URL
    // onto every child page that doesn't set its own (about, terms, guides…),
    // contradicting each page's canonical. Pages that want og:url set it in
    // their own generateMetadata (homepage, listings, category pages).
    locale: 'en_AE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Query & Buy — AI marketplace for the UAE',
    description: SITE_DESCRIPTION,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans", geist.variable, fraunces.variable)}
    >
      <body className="min-h-screen">
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <GoogleAds />
        <GoogleAnalytics />
        <ThemeProvider>
          {children}
          <MobileTabBar />
          <FeedbackWidget />
          <CookieConsent />
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
