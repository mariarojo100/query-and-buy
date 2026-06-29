import Link from 'next/link'
import type { Metadata } from 'next'
import { ContentHeader, Prose } from '@/components/content/Prose'

export const metadata: Metadata = {
  title: 'Terms & Conditions · Query & Buy',
  description: 'The terms that govern your use of the Query & Buy marketplace.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <>
      <ContentHeader eyebrow="Legal" title="Terms & Conditions" updated="June 2026" />
      <Prose>
        <p>
          These Terms govern your use of Query &amp; Buy. By creating an account or using the
          service, you agree to these Terms. If you do not agree, please do not use Query &amp; Buy.
        </p>

        <h2>1. Eligibility</h2>
        <p>
          You must be at least 18 years old and able to form a binding contract. You are responsible
          for the accuracy of your account information and for activity under your account.
        </p>

        <h2>2. The marketplace</h2>
        <p>
          Query &amp; Buy is a venue that connects buyers and sellers. We are{' '}
          <strong>not a party to transactions</strong> between users, we do not take possession of
          items, and we do not process payments. Any sale, payment, and handover is arranged
          directly between the buyer and seller.
        </p>

        <h2>3. Listings &amp; conduct</h2>
        <ul>
          <li>List only items you own and are legally allowed to sell, with accurate descriptions.</li>
          <li>
            Do not list prohibited items — including weapons, drugs, counterfeit goods, or illegal
            services.
          </li>
          <li>Do not spam, harass, scam, or attempt to move deals off-platform to evade safeguards.</li>
          <li>Do not share others&apos; contact details or misuse contact details revealed to you.</li>
        </ul>

        <h2>4. AI-generated content</h2>
        <p>
          Our AI helps draft titles, descriptions, and price suggestions. These are suggestions only
          — you are responsible for reviewing and confirming the accuracy of your listing before
          publishing.
        </p>

        <h2>5. Safety</h2>
        <p>
          Meet in safe, public places, inspect items before paying, and never pay in advance. Query
          &amp; Buy is not responsible for the conduct of users or the condition of items.
        </p>

        <h2>6. Content rights</h2>
        <p>
          You retain ownership of content you post and grant us a licence to host and display it to
          operate the service. You must have the rights to any photos or text you upload.
        </p>

        <h2>7. Suspension &amp; termination</h2>
        <p>
          We may suspend or remove listings, or restrict accounts, that violate these Terms or harm
          the community. You may stop using the service and request account deletion at any time.
        </p>

        <h2>8. Disclaimers &amp; liability</h2>
        <p>
          The service is provided &quot;as is&quot; during beta. To the maximum extent permitted by
          law, Query &amp; Buy is not liable for losses arising from transactions between users or
          from use of the service.
        </p>

        <h2>9. Governing law</h2>
        <p>These Terms are governed by the laws of the United Arab Emirates.</p>

        <h2>10. Contact</h2>
        <p>
          Questions about these Terms? Visit our <Link href="/contact">Contact</Link> page.
        </p>

        <p className="text-sm text-muted-foreground">
          These Terms are provided for a beta product and should be reviewed by qualified legal
          counsel before commercial launch.
        </p>
      </Prose>
    </>
  )
}
