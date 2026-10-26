import type { Metadata } from 'next'
import './globals.css'
import { Fraunces, Figtree, JetBrains_Mono } from "next/font/google";
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

// Editorial-commerce type system (grounded in Refero: Faire, Medium, Beautiful).
// A warm serif masthead (Fraunces, with optical sizing) leads every headline;
// a clean humanist grotesque (Figtree) carries all UI and body text. The
// serif/sans contrast is the identity — not a stock single-family headline.
const display = Fraunces({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-fraunces',
  display: 'swap',
});
const sans = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
  display: 'swap',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
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
      className={cn("font-sans", display.variable, sans.variable, mono.variable)}
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
