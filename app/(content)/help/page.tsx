import Link from 'next/link'
import type { Metadata } from 'next'
import {
  HeartIcon,
  PackageIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  UserIcon,
} from 'lucide-react'
import { ContentHeader } from '@/components/content/Prose'

export const metadata: Metadata = {
  title: 'Help Center · Query & Buy',
  description: 'Guides for selling, buying, staying safe, and managing your account on Query & Buy.',
  alternates: { canonical: '/help' },
}

const TOPICS = [
  {
    icon: PackageIcon,
    title: 'Selling an item',
    points: [
      'Tap Sell, upload 1–8 clear photos of one item.',
      'Review the AI-drafted title, description, and price, then publish.',
      'Manage, pause, edit, or mark items sold from your profile.',
    ],
  },
  {
    icon: ShoppingBagIcon,
    title: 'Buying & offers',
    points: [
      'Search or browse, then open a listing to message the seller.',
      'Send a structured offer; the seller can accept, counter, or decline.',
      'Both confirm to reserve the item and unlock contact details.',
    ],
  },
  {
    icon: ShieldCheckIcon,
    title: 'Staying safe',
    points: [
      'Keep conversations in-app until a deal is confirmed.',
      'Meet in public places and inspect items before paying.',
      'Never pay in advance — Query & Buy does not process payments.',
    ],
  },
  {
    icon: UserIcon,
    title: 'Your account',
    points: [
      'Edit your profile and notification preferences in Settings.',
      'Build reputation through reviews and verified details.',
      'Save searches and wishlist items to find them later.',
    ],
  },
]

export default function HelpPage() {
  return (
    <>
      <ContentHeader eyebrow="Support" title="Help Center" />
      <div className="grid gap-4 sm:grid-cols-2">
        {TOPICS.map((t) => (
          <div key={t.title} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <t.icon className="size-5 text-primary" />
            <p className="font-display mt-3 text-lg">{t.title}</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
              {t.points.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-gold" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <HeartIcon className="size-4 text-gold" />
        Can&apos;t find what you need? Check the{' '}
        <Link href="/faq" className="text-primary hover:underline">FAQ</Link> or{' '}
        <Link href="/contact" className="text-primary hover:underline">contact us</Link>.
      </div>
    </>
  )
}
