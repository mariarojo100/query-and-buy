import Link from 'next/link'
import type { Metadata } from 'next'
import { ContentHeader, Prose } from '@/components/content/Prose'

export const metadata: Metadata = {
  title: 'Cookie Policy · Query & Buy',
  description: 'How Query & Buy uses cookies and how you can manage your preferences.',
  alternates: { canonical: '/cookies' },
}

export default function CookiesPage() {
  return (
    <>
      <ContentHeader eyebrow="Legal" title="Cookie Policy" updated="June 2026" />
      <Prose>
        <p>
          Cookies are small files stored on your device. Query &amp; Buy uses cookies and similar
          technologies (such as local storage) to keep you signed in, remember your preferences, and
          understand how the marketplace is used.
        </p>

        <h2>Types of cookies we use</h2>
        <ul>
          <li>
            <strong>Necessary</strong> — required for core functionality such as authentication,
            security, and saving your session. These cannot be turned off.
          </li>
          <li>
            <strong>Analytics</strong> — help us understand usage so we can improve discovery and
            performance. Optional.
          </li>
          <li>
            <strong>Marketing</strong> — used to personalize promotions and recommendations.
            Optional.
          </li>
        </ul>

        <h2>Managing your preferences</h2>
        <p>
          When you first visit Query &amp; Buy, a consent banner lets you{' '}
          <strong>accept all</strong>, <strong>reject optional</strong> cookies, or{' '}
          <strong>manage preferences</strong> individually. Your choice is stored on your device and
          you can clear it any time through your browser settings to be asked again.
        </p>

        <h2>Local storage</h2>
        <p>
          We also use your browser&apos;s local storage for conveniences like your recent searches
          and cookie-consent choice. This data stays on your device.
        </p>

        <h2>More information</h2>
        <p>
          For how we handle personal data more broadly, see our{' '}
          <Link href="/privacy">Privacy Policy</Link>, or reach us via the{' '}
          <Link href="/contact">Contact</Link> page.
        </p>

        <p className="text-sm text-muted-foreground">
          This policy is provided for a beta product and should be reviewed by qualified legal
          counsel before commercial launch.
        </p>
      </Prose>
    </>
  )
}
