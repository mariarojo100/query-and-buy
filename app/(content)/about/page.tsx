import Link from 'next/link'
import type { Metadata } from 'next'
import { ContentHeader, Prose } from '@/components/content/Prose'

export const metadata: Metadata = {
  title: 'About · Query & Buy',
  description: 'Query & Buy is the AI-powered marketplace for buying and selling across the UAE.',
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return (
    <>
      <ContentHeader eyebrow="Our story" title="About Query & Buy" />
      <Prose>
        <p>
          Query &amp; Buy is an AI-powered marketplace built for the United Arab Emirates. Our goal
          is simple: make buying and selling second-hand goods feel effortless, trustworthy, and
          fast — whether you&apos;re clearing out a closet or hunting for the right deal.
        </p>

        <h2>Why we built it</h2>
        <p>
          Creating a good listing is the hardest part of selling online. You have to photograph the
          item, write a title, describe it accurately, and figure out a fair price. Query &amp; Buy
          removes that friction: snap a few photos and our AI drafts the title, description, key
          details, and a suggested price range in seconds. You stay in control — review, edit, and
          publish when it looks right.
        </p>

        <h2>How it works</h2>
        <ul>
          <li>
            <strong>Sell in under a minute.</strong> Upload photos, let AI write the listing, and
            publish across the Emirates.
          </li>
          <li>
            <strong>Negotiate safely in-app.</strong> Buyers and sellers chat and make structured
            offers without sharing personal contact details up front.
          </li>
          <li>
            <strong>Confirm, then connect.</strong> Contact details are only revealed once both
            sides confirm a deal — reducing spam and scams.
          </li>
        </ul>

        <h2>We&apos;re in beta</h2>
        <p>
          Query &amp; Buy is an early-stage product under active development. Some features are still
          being refined, and your feedback genuinely shapes what we build next. Use the{' '}
          <strong>Feedback</strong> button on any page, or visit our{' '}
          <Link href="/help">Help Center</Link>.
        </p>

        <h2>Get in touch</h2>
        <p>
          Questions, partnerships, or press? Reach us via the <Link href="/contact">Contact</Link>{' '}
          page.
        </p>
      </Prose>
    </>
  )
}
