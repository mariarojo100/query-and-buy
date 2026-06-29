import Link from 'next/link'
import type { Metadata } from 'next'
import { MailIcon, MessageSquarePlusIcon, ShieldCheckIcon } from 'lucide-react'
import { ContentHeader, Prose } from '@/components/content/Prose'

export const metadata: Metadata = {
  title: 'Contact · Query & Buy',
  description: 'Get in touch with the Query & Buy team — support, safety, partnerships, and press.',
  alternates: { canonical: '/contact' },
}

const CARDS = [
  {
    icon: MailIcon,
    title: 'General & support',
    body: 'For account help, listings, or anything else.',
    action: 'support@queryandbuy.ae',
    href: 'mailto:support@queryandbuy.ae',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Trust & safety',
    body: 'Report a listing, user, or safety concern.',
    action: 'safety@queryandbuy.ae',
    href: 'mailto:safety@queryandbuy.ae',
  },
]

export default function ContactPage() {
  return (
    <>
      <ContentHeader eyebrow="We&apos;re here to help" title="Contact us" />
      <div className="grid gap-3 sm:grid-cols-2">
        {CARDS.map((c) => (
          <a
            key={c.title}
            href={c.href}
            className="lift rounded-2xl border border-border bg-card p-5 shadow-soft"
          >
            <c.icon className="size-5 text-primary" />
            <p className="font-display mt-3 text-lg">{c.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
            <p className="mt-3 text-sm font-medium text-primary">{c.action}</p>
          </a>
        ))}
      </div>

      <div className="mt-8">
        <Prose>
          <p>
            The fastest way to reach us about a specific page or bug is the{' '}
            <span className="inline-flex items-center gap-1 align-middle">
              <MessageSquarePlusIcon className="size-4 text-primary" />
              <strong>Feedback</strong>
            </span>{' '}
            button at the bottom of every screen — it captures the page you&apos;re on automatically.
          </p>
          <p>
            We aim to respond within 1–2 business days during the beta. For common questions, the{' '}
            <Link href="/faq">FAQ</Link> and <Link href="/help">Help Center</Link> usually have the
            answer immediately.
          </p>
          <p className="text-sm text-muted-foreground">
            Query &amp; Buy operates in the United Arab Emirates.
          </p>
        </Prose>
      </div>
    </>
  )
}
