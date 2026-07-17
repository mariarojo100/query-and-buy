'use client'

import Script from 'next/script'
import { useEffect } from 'react'

const ADS_ID = 'AW-18324447007'
const START_SELLING_LABEL = 'Hl9UCL-O3NAcEJ--46FE'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function GoogleAds() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null
      const link = el?.closest?.('a[href="/sell"], a[href^="/sell?"]')
      if (!link) return
      window.gtag?.('event', 'conversion', {
        send_to: `${ADS_ID}/${START_SELLING_LABEL}`,
      })
    }
    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [])

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${ADS_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-ads-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${ADS_ID}');
        `}
      </Script>
    </>
  )
}
