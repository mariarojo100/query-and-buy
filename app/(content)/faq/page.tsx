import Link from 'next/link'
import type { Metadata } from 'next'
import { ContentHeader } from '@/components/content/Prose'

export const metadata: Metadata = {
  title: 'FAQ · Query & Buy',
  description: 'Frequently asked questions about buying, selling, AI listings, and safety on Query & Buy.',
  alternates: { canonical: '/faq' },
}

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: 'How much does it cost to use Query & Buy?',
    a: 'Creating an account and listing items is free during our beta. We may introduce optional paid promotions later, which will always be clearly marked.',
  },
  {
    q: 'How does the AI listing work?',
    a: 'Upload a few clear photos of one item and our AI suggests a title, description, key details, and a price range. You can edit everything before publishing — the AI assists, you decide.',
  },
  {
    q: 'Does Query & Buy process payments?',
    a: 'No. Query & Buy connects buyers and sellers and keeps negotiation in-app. Payment and handover happen directly between the two parties — always inspect an item before paying.',
  },
  {
    q: 'When do I see the other person’s contact details?',
    a: 'Contact details are unlocked only after both the buyer and seller confirm a deal. This keeps your phone and email private during negotiation and cuts down on spam.',
  },
  {
    q: 'How do offers and negotiation work?',
    a: 'Buyers send a structured offer from the chat. Sellers can accept, decline, or counter. When an offer is accepted, both sides confirm to reserve the item and exchange contact details.',
  },
  {
    q: 'How do you keep the marketplace safe?',
    a: 'Listings pass automated checks at publish, prohibited items are blocked, and contact-sharing is restricted until a deal is confirmed. You can report any listing or user, and our team reviews reports.',
  },
  {
    q: 'What can’t I sell?',
    a: 'Anything illegal or restricted — including weapons, drugs, counterfeit goods, and adult services. Listings that violate this are removed.',
  },
  {
    q: 'How do reviews work?',
    a: 'After a completed sale, the buyer and seller can rate each other. Ratings build your reputation and appear on your public profile.',
  },
]

export default function FaqPage() {
  return (
    <>
      <ContentHeader eyebrow="Answers" title="Frequently asked questions" />
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {FAQS.map((f, i) => (
          <details key={i} className="group">
            <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">{f.a}</div>
          </details>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Still stuck? Visit the <Link href="/help" className="text-primary hover:underline">Help Center</Link> or{' '}
        <Link href="/contact" className="text-primary hover:underline">contact us</Link>.
      </p>
    </>
  )
}
