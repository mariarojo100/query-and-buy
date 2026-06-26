/** Branded, responsive HTML email templates for Query & Buy. Inline styles only. */

const BRAND = '#2f6f57' // deep emerald
const BRAND_DARK = '#214e3e'
const GOLD = '#b08a4f'
const INK = '#28332c'
const MUTED = '#6b746f'
const BORDER = '#e6e8e3'
const PAPER = '#fafaf8'
const SUPPORT_EMAIL = 'support@queryandbuy.ae'

export type EmailKind =
  | 'offer_received'
  | 'counter_received'
  | 'offer_accepted'
  | 'buyer_confirmed'
  | 'seller_confirmed'
  | 'order_confirmed'
  | 'contact_unlocked'
  | 'listing_reserved'
  | 'item_sold'
  | 'listing_reactivated'
  | 'reservation_cancelled'
  | 'new_review'

export type EmailData = {
  recipientName: string
  listingTitle: string
  listingImageUrl?: string | null
  priceLabel?: string | null
  buyerName?: string | null
  sellerName?: string | null
  ctaUrl: string
  ctaLabel?: string
  // event-specific extras
  secondaryCtaUrl?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  rating?: number | null
  reviewText?: string | null
  reviewerName?: string | null
}

type Opts = {
  heading: string
  intro: string
  ctaLabel: string
  secondaryCta?: { label: string; url: string } | null
  callout?: { label: string; text: string } | null
  contact?: { phone?: string | null; email?: string | null } | null
  safety?: string[] | null
  review?: { rating: number; text?: string | null; reviewer?: string | null } | null
}

/* ---------------- per-event copy + section config ---------------- */
function configFor(kind: EmailKind, d: EmailData): { subject: string; opts: Opts } {
  const price = d.priceLabel ? `<strong>${d.priceLabel}</strong>` : 'the agreed amount'
  switch (kind) {
    case 'offer_received':
      return {
        subject: '📩 New Offer Received for Your Listing',
        opts: {
          heading: 'You have a new offer',
          intro: `${esc(d.buyerName ?? 'A buyer')} offered ${price} for your listing. Open the conversation to accept, counter, or decline.`,
          ctaLabel: 'View Conversation',
        },
      }
    case 'counter_received':
      return {
        subject: '🔄 Seller Sent a Counter Offer',
        opts: {
          heading: 'You received a counter offer',
          intro: `${esc(d.sellerName ?? 'The seller')} countered with ${price}. Review it and respond in the conversation.`,
          ctaLabel: 'Review Offer',
        },
      }
    case 'offer_accepted':
      return {
        subject: '✅ Offer Accepted',
        opts: {
          heading: 'Your offer was accepted',
          intro: `Great news — your offer of ${price} was accepted.`,
          ctaLabel: 'Open Chat',
          callout: {
            label: 'Next steps',
            text: 'Both of you confirm the deal in chat to unlock contact details and reserve the item.',
          },
        },
      }
    case 'buyer_confirmed':
      return {
        subject: '🎉 Buyer Confirmed the Order',
        opts: {
          heading: 'The buyer confirmed the order',
          intro: `The buyer confirmed the deal at ${price}.`,
          ctaLabel: 'Open Conversation',
          callout: { label: 'Remaining step', text: 'Waiting for your confirmation.' },
        },
      }
    case 'seller_confirmed':
      return {
        subject: '🎉 Seller Confirmed the Order',
        opts: {
          heading: 'The seller confirmed the order',
          intro: `The seller confirmed the deal at ${price}.`,
          ctaLabel: 'Open Conversation',
          callout: { label: 'Remaining step', text: 'Waiting for both confirmations.' },
        },
      }
    case 'order_confirmed':
      return {
        subject: '🎉 Your Order Has Been Confirmed',
        opts: {
          heading: 'Your order is confirmed',
          intro: `Both parties confirmed the deal at ${price}. The item is now reserved and contact details are unlocked in your conversation.`,
          ctaLabel: 'Open Conversation',
          callout: {
            label: 'Contact details unlocked',
            text: 'You can now see each other’s phone and email in the conversation.',
          },
          safety: [
            'Meet in a safe, public place to inspect the item and pay.',
            'Always inspect the item before paying.',
            'Never pay in advance — Query & Buy does not process payments.',
          ],
        },
      }
    case 'contact_unlocked':
      return {
        subject: '📞 Contact Details Are Now Available',
        opts: {
          heading: 'Contact details are now available',
          intro: 'You can now arrange pickup directly with the other party.',
          ctaLabel: 'Open Conversation',
          contact: { phone: d.contactPhone, email: d.contactEmail },
          safety: [
            'Arrange pickup directly with the other party.',
            'Always inspect the item before payment.',
            'Meet in a safe, public location.',
          ],
        },
      }
    case 'reservation_cancelled':
    case 'listing_reactivated':
      return {
        subject: 'Reservation Cancelled',
        opts: {
          heading: 'Reservation cancelled',
          intro: 'The seller reactivated the listing, so the reservation was cancelled. The item is available again.',
          ctaLabel: 'Browse Similar Listings',
          callout: {
            label: 'Reason',
            text: 'Seller reactivated the listing. The item is available again.',
          },
        },
      }
    case 'item_sold':
      return {
        subject: '✅ Transaction Completed',
        opts: {
          heading: 'Transaction completed 🎉',
          intro: `The deal for <strong>${esc(d.listingTitle)}</strong> is complete at ${price}. Thank you for using Query & Buy!`,
          ctaLabel: 'Leave a Review',
          callout: {
            label: 'One last thing',
            text: 'Leave a review to help build trust in the marketplace — it only takes a moment.',
          },
        },
      }
    case 'new_review':
      return {
        subject: '⭐ You Received a New Review',
        opts: {
          heading: 'You received a new review',
          intro: `${esc(d.reviewerName ?? 'Someone')} left you a review on Query & Buy.`,
          ctaLabel: 'View Profile',
          review: {
            rating: d.rating ?? 0,
            text: d.reviewText,
            reviewer: d.reviewerName,
          },
        },
      }
    case 'listing_reserved':
    default:
      return {
        subject: `Reserved — ${d.listingTitle}`,
        opts: {
          heading: 'Your item is reserved',
          intro: 'Your listing is reserved while you complete the transaction.',
          ctaLabel: 'Open Conversation',
        },
      }
  }
}

export function buildEmail(kind: EmailKind, d: EmailData): { subject: string; html: string } {
  const { subject, opts } = configFor(kind, d)
  return { subject, html: layout(d, opts) }
}

/* ---------------- layout ---------------- */
function layout(d: EmailData, o: Opts): string {
  const img = d.listingImageUrl
    ? `<tr><td style="padding:0 24px 4px"><img src="${d.listingImageUrl}" alt="${esc(d.listingTitle)}" width="552" style="width:100%;max-width:552px;border-radius:14px;border:1px solid ${BORDER};display:block" /></td></tr>`
    : ''

  const meta = [
    d.priceLabel ? `<strong style="color:${INK}">${esc(d.priceLabel)}</strong>` : '',
    d.buyerName ? `Buyer: ${esc(d.buyerName)}` : '',
    d.sellerName ? `Seller: ${esc(d.sellerName)}` : '',
  ]
    .filter(Boolean)
    .join(' &nbsp;·&nbsp; ')

  const callout = o.callout
    ? `<tr><td style="padding:16px 24px 0"><table role="presentation" width="100%" style="background:${PAPER};border:1px solid ${BORDER};border-radius:12px"><tr><td style="padding:12px 14px">
        <p style="margin:0;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${GOLD};font-weight:700">${esc(o.callout.label)}</p>
        <p style="margin:4px 0 0;font-size:14px;color:${INK}">${esc(o.callout.text)}</p>
      </td></tr></table></td></tr>`
    : ''

  const contact =
    o.contact && (o.contact.phone || o.contact.email)
      ? `<tr><td style="padding:16px 24px 0"><table role="presentation" width="100%" style="background:#ffffff;border:1px solid ${BORDER};border-radius:12px"><tr><td style="padding:14px 16px">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${BRAND};font-weight:700">Contact details</p>
          ${o.contact.phone ? `<p style="margin:2px 0;font-size:15px;color:${INK}">📞 <a href="tel:${esc(o.contact.phone)}" style="color:${BRAND};text-decoration:none">${esc(o.contact.phone)}</a></p>` : ''}
          ${o.contact.email ? `<p style="margin:2px 0;font-size:15px;color:${INK}">✉️ <a href="mailto:${esc(o.contact.email)}" style="color:${BRAND};text-decoration:none">${esc(o.contact.email)}</a></p>` : ''}
        </td></tr></table></td></tr>`
      : ''

  const review = o.review
    ? `<tr><td style="padding:16px 24px 0"><table role="presentation" width="100%" style="background:${PAPER};border:1px solid ${BORDER};border-radius:12px"><tr><td style="padding:14px 16px">
        <p style="margin:0;font-size:20px;letter-spacing:2px;color:${GOLD}">${stars(o.review.rating)}</p>
        ${o.review.text ? `<p style="margin:8px 0 0;font-size:15px;color:${INK};font-style:italic">“${esc(o.review.text)}”</p>` : ''}
        ${o.review.reviewer ? `<p style="margin:8px 0 0;font-size:13px;color:${MUTED}">— ${esc(o.review.reviewer)}</p>` : ''}
      </td></tr></table></td></tr>`
    : ''

  const safety = o.safety?.length
    ? `<tr><td style="padding:16px 24px 0"><table role="presentation" width="100%" style="background:#f3f6f3;border:1px solid ${BORDER};border-radius:12px"><tr><td style="padding:12px 16px">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${BRAND};font-weight:700">Stay safe</p>
        ${o.safety.map((s) => `<p style="margin:3px 0;font-size:13px;color:${INK}">• ${esc(s)}</p>`).join('')}
      </td></tr></table></td></tr>`
    : ''

  const secondary = o.secondaryCta
    ? `&nbsp;&nbsp;<a href="${o.secondaryCta.url}" style="display:inline-block;background:#ffffff;color:${BRAND};border:1px solid ${BORDER};text-decoration:none;font-size:14px;font-weight:600;padding:11px 20px;border-radius:999px">${esc(o.secondaryCta.label)}</a>`
    : ''

  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"></head><body style="margin:0;background:${PAPER};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${BORDER};border-radius:20px;overflow:hidden">
        <!-- header -->
        <tr><td style="background:linear-gradient(135deg,${BRAND},${BRAND_DARK});padding:20px 24px">
          <span style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#ffffff">Query<span style="color:rgba(255,255,255,.6)"> &amp; </span>Buy</span>
          <span style="float:right;font-size:11px;color:rgba(255,255,255,.75);padding-top:4px">AI Marketplace · UAE</span>
        </td></tr>
        <tr><td style="padding:24px 24px 4px">
          <h1 style="margin:0;font-size:22px;line-height:1.25;color:${INK}">${esc(o.heading)}</h1>
          <p style="margin:6px 0 14px;font-size:13px;color:${MUTED}">Hi ${esc(d.recipientName || 'there')},</p>
        </td></tr>
        ${img}
        <tr><td style="padding:14px 24px 0">
          <p style="margin:0;font-size:16px;font-weight:600;color:${INK}">${esc(d.listingTitle)}</p>
          ${meta ? `<p style="margin:4px 0 0;font-size:13px;color:${MUTED}">${meta}</p>` : ''}
        </td></tr>
        <tr><td style="padding:14px 24px 0"><p style="margin:0;font-size:15px;line-height:1.55;color:${INK}">${o.intro}</p></td></tr>
        ${callout}
        ${contact}
        ${review}
        ${safety}
        <tr><td style="padding:22px 24px 28px">
          <a href="${d.ctaUrl}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:999px">${esc(o.ctaLabel)}</a>${secondary}
        </td></tr>
        <!-- footer -->
        <tr><td style="padding:18px 24px;border-top:1px solid ${BORDER};background:${PAPER}">
          <p style="margin:0 0 6px;font-size:12px;color:${MUTED}">Query &amp; Buy — the AI marketplace for the UAE.</p>
          <p style="margin:0 0 8px;font-size:12px;color:${MUTED}">
            <a href="#" style="color:${BRAND};text-decoration:none">Instagram</a> &nbsp;·&nbsp;
            <a href="#" style="color:${BRAND};text-decoration:none">X</a> &nbsp;·&nbsp;
            <a href="#" style="color:${BRAND};text-decoration:none">Facebook</a>
          </p>
          <p style="margin:0;font-size:12px;color:${MUTED}">Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};text-decoration:none">${SUPPORT_EMAIL}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function stars(rating: number): string {
  const r = Math.max(0, Math.min(5, Math.round(rating)))
  return '★'.repeat(r) + '☆'.repeat(5 - r)
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
