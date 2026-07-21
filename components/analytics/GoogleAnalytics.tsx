'use client'

import Script from 'next/script'

/**
 * GA4 (Google Analytics 4) tag. Env-gated: renders nothing unless
 * NEXT_PUBLIC_GA_ID is set (e.g. "G-XXXXXXXXXX"), so it's safe to ship before
 * a property exists — just set the env var to activate it, no code change.
 *
 * Note: the site CSP must allow https://www.googletagmanager.com in script-src
 * and the google-analytics domains in connect-src/img-src, or the tag loads but
 * never sends data. That allowance lives in next.config.ts.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID

export function GoogleAnalytics() {
  if (!GA_ID) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  )
}
