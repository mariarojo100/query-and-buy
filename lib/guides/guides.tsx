import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * Guides — evergreen, informational SEO content targeting research-intent
 * queries ("how to sell a car privately in the UAE", "is it safe to buy
 * second-hand in Dubai", "how to check a used iPhone"). Each guide links into
 * the relevant category / city landing pages to pass authority and give
 * readers a next step. Bodies are plain JSX rendered inside <Prose>.
 */

export type Guide = {
  slug: string
  title: string
  /** <title> / list / meta description (≤ ~160 chars). */
  description: string
  eyebrow: string
  /** ISO dates (YYYY-MM-DD). */
  published: string
  updated: string
  Body: () => ReactNode
}

export const GUIDES: Guide[] = [
  {
    slug: 'how-to-sell-your-car-privately-in-the-uae',
    title: 'How to Sell Your Car Privately in the UAE',
    description:
      'A step-by-step guide to selling your car privately in the UAE — paperwork, pricing, safe viewings and transferring ownership at the RTA.',
    eyebrow: 'Selling guide',
    published: '2026-07-20',
    updated: '2026-07-20',
    Body: () => (
      <>
        <p>
          Selling your car privately in the UAE almost always gets you more than a dealer trade-in —
          but it means handling the paperwork, pricing and viewings yourself. Here is how to do it
          properly, safely and quickly.
        </p>

        <h2>1. Get your paperwork in order</h2>
        <p>
          Before you list, make sure you have your vehicle registration card (the{' '}
          <em>mulkiya</em>), your Emirates ID, and a valid insurance and registration status. Settle
          any outstanding traffic fines first — you cannot transfer ownership with unpaid fines
          against the plate. If your car is still on finance, contact your bank to get a liability
          letter and clearance, as the loan must be cleared before transfer.
        </p>

        <h2>2. Price it realistically</h2>
        <p>
          Buyers research before they message. Browse current{' '}
          <Link href="/category/vehicles">used vehicle listings</Link> for the same make, model,
          year and mileage to see the real market, then price within that range. Be honest about
          condition — an accurate price attracts serious buyers, while an inflated one just means
          weeks of no replies.
        </p>

        <h2>3. Write a listing that actually sells</h2>
        <p>
          Take clear daytime photos from several angles, including the interior, tyres and any
          damage. List the key specs (year, mileage, service history, accident history) honestly.
          On Query &amp; Buy you can snap a few photos and let AI draft the title, description and a
          suggested price — you review and publish in under a minute. When you are ready,{' '}
          <Link href="/sell">start your listing here</Link>.
        </p>

        <h2>4. Handle viewings and test drives safely</h2>
        <p>
          Chat with buyers inside the app first so your phone number stays private until you are
          ready. Meet in a public, well-lit place during the day. Accompany the buyer on any test
          drive and confirm they hold a valid UAE licence. Never hand over the keys or the car
          before payment has fully cleared.
        </p>

        <h2>5. Transfer ownership the right way</h2>
        <p>
          Ownership transfer happens at an official RTA / traffic department centre or an approved
          vehicle-testing centre. Both buyer and seller (or an authorised representative) attend
          with Emirates IDs and the mulkiya. The buyer arranges new insurance in their name before
          the transfer. Only release the vehicle once the transfer is complete and payment has
          settled.
        </p>

        <p>
          Ready to sell? Browse the market first on{' '}
          <Link href="/category/vehicles/dubai">used cars in Dubai</Link> or{' '}
          <Link href="/category/vehicles/abu-dhabi">used cars in Abu Dhabi</Link>, then{' '}
          <Link href="/sell">create your listing</Link>.
        </p>
      </>
    ),
  },
  {
    slug: 'is-it-safe-to-buy-second-hand-online-in-dubai',
    title: 'Is It Safe to Buy Second-Hand Online in Dubai? A Buyer’s Guide',
    description:
      'How to buy pre-owned items safely in Dubai and the UAE — spotting scams, vetting sellers, meeting safely and paying without getting caught out.',
    eyebrow: 'Safety guide',
    published: '2026-07-20',
    updated: '2026-07-20',
    Body: () => (
      <>
        <p>
          Buying second-hand online in Dubai is a great way to save money — the vast majority of
          deals go smoothly. The small number that go wrong almost always share the same warning
          signs. Learn them and you can buy with confidence.
        </p>

        <h2>Spot the common scams</h2>
        <ul>
          <li>
            <strong>The “too good to be true” price.</strong> A latest-model phone or luxury bag far
            below market value is the oldest trick there is. If the price seems impossible, it
            usually is.
          </li>
          <li>
            <strong>Pressure to pay a deposit first.</strong> Anyone insisting you transfer money to
            “hold” an item before you have seen it — especially a seller who suddenly cannot meet in
            person — is a red flag.
          </li>
          <li>
            <strong>Moving the conversation off-platform.</strong> Scammers push you to WhatsApp or
            email quickly so there is no record. Keep the conversation in the app until you trust
            the person.
          </li>
        </ul>

        <h2>Vet the seller</h2>
        <p>
          Look for a verified profile and reasonable listing history. Ask specific questions about
          the item — genuine sellers answer readily and can send extra photos on request (serial
          numbers, receipts, close-ups of wear). Vague answers or refusal to provide proof are a
          reason to walk away.
        </p>

        <h2>Meet and pay safely</h2>
        <p>
          Meet in a busy public place during the day — a mall, a metro station, a building lobby.
          Inspect and test the item fully before paying: power it on, check every function, and
          confirm it matches the listing. Prefer paying only once you are holding the item and
          satisfied. Never send money in advance to someone you have not met.
        </p>

        <h2>How Query &amp; Buy is built to protect you</h2>
        <p>
          Query &amp; Buy keeps your contact details private until you and the seller both agree to
          connect, so you are not handing out your number to strangers. Buyers and sellers negotiate
          through in-app messaging, and profiles can be verified — all designed to cut down on spam
          and scams. Prices are shown upfront in AED with no hidden fees.
        </p>

        <p>
          Ready to browse safely? Explore{' '}
          <Link href="/category/electronics/dubai">electronics in Dubai</Link>,{' '}
          <Link href="/category/mobiles/dubai">mobiles in Dubai</Link>, or the full{' '}
          <Link href="/category/electronics">electronics category</Link>.
        </p>
      </>
    ),
  },
  {
    slug: 'how-to-check-a-used-iphone-before-buying-in-the-uae',
    title: 'How to Check a Used iPhone Before Buying in the UAE',
    description:
      'A practical checklist for buying a used iPhone in the UAE — verify iCloud is removed, check the IMEI, test the battery and hardware, and pay a fair price.',
    eyebrow: 'Buying guide',
    published: '2026-07-20',
    updated: '2026-07-20',
    Body: () => (
      <>
        <p>
          A used iPhone can be a great deal in the UAE — if you check the right things before you
          pay. A locked or blacklisted phone is effectively useless, so run through this checklist
          before handing over any money.
        </p>

        <h2>Before you meet</h2>
        <ul>
          <li>
            <strong>Ask the seller to sign out of iCloud.</strong> Have them remove their Apple
            account (Settings → [name] → Sign Out) and erase the phone before you meet. If the phone
            still asks for someone else’s Apple ID on setup, it is Activation Locked — do not buy it.
          </li>
          <li>
            <strong>Request the IMEI.</strong> Ask for the IMEI number (dial *#06# or check Settings
            → General → About) so you can confirm the model and check it is not reported lost or
            blacklisted.
          </li>
        </ul>

        <h2>Check it in person</h2>
        <ul>
          <li>
            <strong>Activation.</strong> Insert your own SIM and confirm the phone activates cleanly
            and connects to the network.
          </li>
          <li>
            <strong>Battery health.</strong> Check Settings → Battery → Battery Health. Anything
            around 80% or above is reasonable for a used device; much lower means a battery
            replacement soon.
          </li>
          <li>
            <strong>Screen and body.</strong> Look for cracks, dead pixels, discolouration and
            frame damage. Test the touchscreen across the whole display.
          </li>
          <li>
            <strong>Cameras, Face/Touch ID, buttons and charging.</strong> Test the front and rear
            cameras, biometrics, all buttons, speakers, microphone and charging port.
          </li>
        </ul>

        <h2>Confirm it is not stolen or blacklisted</h2>
        <p>
          A blacklisted IMEI can be blocked from networks, leaving you with a phone that cannot make
          calls. Verify the IMEI status and be cautious of any seller who will not share it or seems
          evasive about how they got the phone.
        </p>

        <h2>Pay a fair price</h2>
        <p>
          Compare the asking price against similar listings for the same model, storage and
          condition. Used iPhones from private sellers are typically well below retail, and many
          listings are negotiable — message the seller through the app to make a reasonable offer.
        </p>

        <p>
          Ready to look? Browse{' '}
          <Link href="/category/mobiles">mobiles &amp; tablets</Link>,{' '}
          <Link href="/category/mobiles/dubai">used phones in Dubai</Link>, or{' '}
          <Link href="/category/mobiles/sharjah">used phones in Sharjah</Link>.
        </p>
      </>
    ),
  },
]

export function getGuide(slug: string): Guide | null {
  return GUIDES.find((g) => g.slug === slug) ?? null
}
