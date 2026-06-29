import Link from 'next/link'
import type { Metadata } from 'next'
import { ContentHeader, Prose } from '@/components/content/Prose'

export const metadata: Metadata = {
  title: 'Privacy Policy · Query & Buy',
  description: 'How Query & Buy collects, uses, and protects your personal data.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <>
      <ContentHeader eyebrow="Legal" title="Privacy Policy" updated="June 2026" />
      <Prose>
        <p>
          This Privacy Policy explains how Query &amp; Buy (&quot;we&quot;, &quot;us&quot;) collects,
          uses, and protects your personal data when you use our marketplace. We are committed to
          handling your data responsibly and in line with the UAE&apos;s Personal Data Protection Law
          (PDPL).
        </p>

        <h2>Information we collect</h2>
        <ul>
          <li>
            <strong>Account data</strong> — name, username, email, and (if provided) phone number and
            emirate.
          </li>
          <li>
            <strong>Content you create</strong> — listings, photos, messages, offers, and reviews.
          </li>
          <li>
            <strong>Usage data</strong> — pages viewed, searches, and listings you view, used to
            improve discovery and recommendations.
          </li>
          <li>
            <strong>Device data</strong> — basic technical information needed to operate and secure
            the service.
          </li>
        </ul>

        <h2>How we use your data</h2>
        <ul>
          <li>To operate the marketplace — publishing listings, enabling chat, offers, and orders.</li>
          <li>To keep the platform safe — moderation, fraud prevention, and enforcing our rules.</li>
          <li>To improve the product — analytics, recommendations, and trending searches.</li>
          <li>To communicate with you — transactional emails and notifications you&apos;ve enabled.</li>
        </ul>

        <h2>What we share</h2>
        <p>
          We do not sell your personal data. Your public profile and listings are visible to other
          users. <strong>Contact details are shared only after both parties confirm a deal.</strong>{' '}
          We use trusted service providers (for hosting, database, AI processing, and email) who
          process data on our behalf under appropriate safeguards.
        </p>

        <h2>Data retention</h2>
        <p>
          We keep your data for as long as your account is active or as needed to provide the
          service and meet legal obligations. You can request deletion of your account and
          associated personal data.
        </p>

        <h2>Your rights</h2>
        <p>
          You have the right to access, correct, or delete your personal data, and to object to or
          restrict certain processing. To exercise these rights, contact{' '}
          <a href="mailto:privacy@queryandbuy.ae">privacy@queryandbuy.ae</a>.
        </p>

        <h2>Cookies</h2>
        <p>
          We use cookies and similar technologies as described in our{' '}
          <Link href="/cookies">Cookie Policy</Link>. You can manage optional cookies at any time via
          the consent banner.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy? Email{' '}
          <a href="mailto:privacy@queryandbuy.ae">privacy@queryandbuy.ae</a> or visit our{' '}
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
