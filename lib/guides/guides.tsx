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
          <Link href="/vehicles">used vehicle listings</Link> for the same make, model,
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
          <Link href="/vehicles/dubai">used cars in Dubai</Link> or{' '}
          <Link href="/vehicles/abu-dhabi">used cars in Abu Dhabi</Link>, then{' '}
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
          <Link href="/electronics/dubai">electronics in Dubai</Link>,{' '}
          <Link href="/mobiles/dubai">mobiles in Dubai</Link>, or the full{' '}
          <Link href="/electronics">electronics category</Link>.
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
          <Link href="/mobiles">mobiles &amp; tablets</Link>,{' '}
          <Link href="/mobiles/dubai">used phones in Dubai</Link>, or{' '}
          <Link href="/mobiles/sharjah">used phones in Sharjah</Link>.
        </p>
      </>
    ),
  },
  {
    slug: 'how-much-is-my-car-worth-in-the-uae',
    title: 'How Much Is My Car Worth in the UAE? A Pricing Guide',
    description:
      'How to value your used car in the UAE — what affects the price, how to research the market, and how to set an asking price that actually sells.',
    eyebrow: 'Pricing guide',
    published: '2026-07-20',
    updated: '2026-07-20',
    Body: () => (
      <>
        <p>
          Pricing your car is the difference between a quick sale and a listing that sits for weeks.
          Price too high and no one messages; too low and you leave money on the table. Here is how
          to land on a fair, sellable number.
        </p>

        <h2>What actually affects your car&apos;s value</h2>
        <ul>
          <li>
            <strong>Make, model and year.</strong> The starting point — some brands hold value far
            better than others in the UAE market.
          </li>
          <li>
            <strong>Mileage.</strong> Lower mileage commands a premium; very high mileage narrows
            your buyer pool.
          </li>
          <li>
            <strong>Service history and condition.</strong> A full agency service history, clean
            interior and no accident record all add real value.
          </li>
          <li>
            <strong>Specs and options.</strong> GCC specs, sunroof, upgraded trim and desirable
            colours can nudge the price up.
          </li>
        </ul>

        <h2>Research the real market</h2>
        <p>
          The most reliable valuation is what similar cars are actually listed for right now. Browse{' '}
          <Link href="/vehicles">current used-car listings</Link> filtered to your make,
          model, year and mileage, and note the range. Ignore the one or two outliers at the top and
          bottom — aim for the middle of the cluster.
        </p>

        <h2>Set your asking price</h2>
        <p>
          List slightly above your true target to leave room for the negotiation buyers expect, but
          stay within the realistic market band so you still appear in their searches. An honest,
          well-photographed listing at a fair price gets more serious enquiries than a cheap one with
          no detail.
        </p>

        <p>
          When you are ready, check the market on{' '}
          <Link href="/vehicles/dubai">used cars in Dubai</Link> and{' '}
          <Link href="/vehicles/abu-dhabi">Abu Dhabi</Link>, then{' '}
          <Link href="/sell">list your car</Link> — snap a few photos and let AI draft the details
          and a suggested price.
        </p>
      </>
    ),
  },
  {
    slug: 'how-much-is-my-iphone-worth-in-the-uae',
    title: 'How Much Is My iPhone Worth in the UAE?',
    description:
      'Work out the resale value of your used iPhone in the UAE — the factors that matter most, how to check the market, and how to sell it fast.',
    eyebrow: 'Pricing guide',
    published: '2026-07-20',
    updated: '2026-07-20',
    Body: () => (
      <>
        <p>
          iPhones hold their value better than most phones, but resale prices drop steadily with each
          new release. Here is how to figure out what yours is worth today and sell it before it
          depreciates further.
        </p>

        <h2>What determines the resale value</h2>
        <ul>
          <li>
            <strong>Model and storage.</strong> Newer models and higher storage tiers are worth
            more — and the gap widens for Pro and Pro Max versions.
          </li>
          <li>
            <strong>Battery health.</strong> A battery above ~85% reassures buyers; a worn battery
            knocks the price down noticeably.
          </li>
          <li>
            <strong>Condition.</strong> Screen scratches, dents and a cracked back all reduce value.
            A clean phone with a case-and-screen-protector history sells for more.
          </li>
          <li>
            <strong>Box and accessories.</strong> The original box, cable and receipt add buyer
            confidence and a small premium.
          </li>
        </ul>

        <h2>Check what the market is paying</h2>
        <p>
          Search <Link href="/mobiles">current iPhone listings</Link> for your exact model,
          storage and condition to see the live range. Prices move fast around new-model launches, so
          recent listings matter more than old ones.
        </p>

        <h2>Sell it before it drops further</h2>
        <p>
          Because phones depreciate quickly, the best time to sell is usually now rather than later —
          especially just before a new model is announced. Back up and erase your data, sign out of
          iCloud, and take clear photos of the actual device.
        </p>

        <p>
          Ready to sell? Compare prices for{' '}
          <Link href="/mobiles/dubai">used phones in Dubai</Link> or{' '}
          <Link href="/mobiles/abu-dhabi">Abu Dhabi</Link>, then{' '}
          <Link href="/sell">create your listing</Link>.
        </p>
      </>
    ),
  },
  {
    slug: 'buying-used-furniture-in-the-uae-checklist',
    title: 'Buying Used Furniture in the UAE: A Complete Checklist',
    description:
      'Everything to check before buying second-hand furniture in the UAE — measurements, condition, delivery and how to avoid common mistakes.',
    eyebrow: 'Buying guide',
    published: '2026-07-20',
    updated: '2026-07-20',
    Body: () => (
      <>
        <p>
          With so many people moving in and out of the UAE, quality second-hand furniture sells at a
          fraction of retail — if you know what to check. Run through this checklist before you buy.
        </p>

        <h2>Measure before you commit</h2>
        <p>
          The single most common mistake is buying furniture that does not fit. Measure your space —
          and doorways, lifts and stairwells for the delivery path — then confirm the item&apos;s exact
          dimensions with the seller before agreeing to anything.
        </p>

        <h2>Check the condition properly</h2>
        <ul>
          <li>
            <strong>Structure.</strong> Test that chairs, tables and bed frames are sturdy with no
            wobble or cracks.
          </li>
          <li>
            <strong>Upholstery.</strong> Look (and, in person, check) for stains, tears, odours and
            signs of pests — ask for close-up photos before you travel to view.
          </li>
          <li>
            <strong>Appliances.</strong> For anything electrical, ask to see it powered on and
            working.
          </li>
        </ul>

        <h2>Sort out delivery</h2>
        <p>
          Larger items need a plan. Agree with the seller who arranges transport and who pays, and
          confirm timing before you finalise. Many sellers can recommend a mover for bulky pieces.
        </p>

        <h2>Meet and pay safely</h2>
        <p>
          Message the seller through the app to ask questions and keep your details private, view the
          item in person where possible, and pay once you are satisfied it matches the listing.
        </p>

        <p>
          Start browsing{' '}
          <Link href="/home-garden">home &amp; garden listings</Link>, or narrow to{' '}
          <Link href="/home-garden/dubai">furniture in Dubai</Link> and{' '}
          <Link href="/home-garden/sharjah">Sharjah</Link>.
        </p>
      </>
    ),
  },
  {
    slug: 'how-to-rent-an-apartment-in-dubai-without-an-agent',
    title: 'How to Rent an Apartment in Dubai Without an Agent',
    description:
      'Rent directly from owners in Dubai and skip the agency fee — how to search, what to check on Ejari and the tenancy contract, and how to stay safe.',
    eyebrow: 'Property guide',
    published: '2026-07-20',
    updated: '2026-07-20',
    Body: () => (
      <>
        <p>
          Renting directly from an owner in Dubai can save you the agency commission — but it also
          means doing the due diligence yourself. Here is how to do it properly and safely.
        </p>

        <h2>Search smart</h2>
        <p>
          Decide on your budget, preferred communities and must-haves (parking, chiller, number of
          cheques) first, then browse{' '}
          <Link href="/property">property listings</Link> and message listers directly
          through the app to arrange viewings. Keeping the conversation in-app protects your contact
          details until you are ready to share them.
        </p>

        <h2>View in person and ask the right questions</h2>
        <ul>
          <li>
            Confirm exactly what the rent includes — chiller/AC, maintenance, and how many cheques
            are accepted.
          </li>
          <li>Check the unit&apos;s actual condition, water pressure, AC and any building amenities.</li>
          <li>Ask who you are dealing with — the owner or an authorised representative.</li>
        </ul>

        <h2>Check the paperwork</h2>
        <p>
          A legitimate tenancy in Dubai is registered through <strong>Ejari</strong>. Confirm the
          landlord&apos;s ownership and that the contract will be Ejari-registered, review the tenancy
          terms carefully, and understand the RERA rules on rent and renewals before you sign.
        </p>

        <h2>Stay safe with payments</h2>
        <p>
          Never transfer a deposit before you have viewed the unit and verified who you are dealing
          with. Be wary of below-market listings that demand money up front — a classic rental scam
          sign.
        </p>

        <p>
          Ready to look? Browse{' '}
          <Link href="/property/dubai">property in Dubai</Link> or the full{' '}
          <Link href="/property">property category</Link>.
        </p>
      </>
    ),
  },
  {
    slug: 'how-to-check-a-used-car-before-buying-in-the-uae',
    title: 'How to Check a Used Car Before Buying in the UAE',
    description:
      'A buyer’s checklist for used cars in the UAE — history and fines, mechanical checks, the test drive, and transferring ownership safely at the RTA.',
    eyebrow: 'Buying guide',
    published: '2026-07-24',
    updated: '2026-07-24',
    Body: () => (
      <>
        <p>
          Buying a used car privately in the UAE can save you thousands over a dealer — as long as
          you check the car, the paperwork and the seller properly before any money changes hands.
          Here is the checklist to run through.
        </p>

        <h2>1. Check the car’s history and fines</h2>
        <p>
          Ask for the vehicle registration card (the <em>mulkiya</em>) and confirm the details match
          the car and the seller’s Emirates ID. Check for outstanding traffic fines and any finance
          or loan still registered against the plate — these must be cleared before ownership can
          transfer. A car still on finance can only be sold once the bank issues a clearance letter.
        </p>

        <h2>2. Inspect it in daylight</h2>
        <p>
          Always view the car in daylight and dry weather. Look for mismatched paint or panel gaps
          (a sign of accident repair), uneven tyre wear, fluid leaks under the engine, and the
          condition of the tyres, brakes and interior. For anything above a modest price, it is
          well worth paying for an independent inspection at an approved testing centre.
        </p>

        <h2>3. Take a proper test drive</h2>
        <p>
          Drive at a range of speeds. Listen for knocks or whines, check the AC cools quickly (it
          matters in the Gulf), test the brakes and steering for pulling or vibration, and make sure
          the gearbox shifts smoothly. Warning lights on the dashboard should not be ignored or
          explained away.
        </p>

        <h2>4. Compare the price to the market</h2>
        <p>
          Before you negotiate, browse current{' '}
          <Link href="/vehicles">used car listings</Link> — and{' '}
          <Link href="/vehicles/dubai">cars in Dubai</Link> specifically — for the same
          make, model, year and mileage, so you know a fair figure. A price well below the market
          usually signals a problem, not a bargain.
        </p>

        <h2>5. Transfer ownership the right way</h2>
        <p>
          Complete the transfer at an official RTA / traffic department centre or an approved
          testing centre, with both parties present and their Emirates IDs. Arrange insurance in
          your name before the transfer, and never pay in full or drive away until the ownership has
          officially changed hands. On Query &amp; Buy your contact details stay private until you
          are ready to meet.
        </p>
      </>
    ),
  },
  {
    slug: 'selling-furniture-before-leaving-the-uae',
    title: 'Selling Your Furniture Before Leaving the UAE',
    description:
      'Moving out of the UAE? A practical guide to selling furniture and appliances quickly — pricing, photos, timing and arranging pickup before you fly.',
    eyebrow: 'Selling guide',
    published: '2026-07-24',
    updated: '2026-07-24',
    Body: () => (
      <>
        <p>
          Leaving the UAE usually means clearing a whole home in a few weeks. Furniture and
          appliances sell fast here if you price and time them well — here is how to turn a full
          apartment into cash before you fly.
        </p>

        <h2>Start early and price to move</h2>
        <p>
          Begin listing three to four weeks before you leave. Buyers know a mover is on a deadline,
          so price a little below what similar items are going for and be upfront that everything
          must go. Check current{' '}
          <Link href="/home-garden">furniture and appliance listings</Link> to set a
          realistic figure.
        </p>

        <h2>Photograph each item well</h2>
        <p>
          Clear, bright photos sell furniture. Shoot each piece from a couple of angles in good
          light, note the dimensions and any wear, and keep descriptions honest. On Query &amp; Buy
          you can snap a photo and let AI draft the title, description and a suggested price, so
          listing a whole home takes minutes — <Link href="/sell">start listing here</Link>.
        </p>

        <h2>Bundle and stagger</h2>
        <p>
          Group small items into bundles (kitchen lot, kids’ room lot) to shift them faster, but
          list big-ticket pieces — sofas, fridges, washing machines — separately, as they attract
          the most buyers. Keep the essentials you still need until the last few days, then sell
          those last.
        </p>

        <h2>Agree pickup and payment clearly</h2>
        <p>
          Confirm with each buyer who arranges and pays for transport, especially for heavy items,
          and set a collection time. Take payment on collection, and meet buyers with someone else
          at home where you can. Keep chats inside the app so your number stays private until you
          choose to share it.
        </p>

        <h2>Time the last pickups around your flight</h2>
        <p>
          Line up the final collections a day or two before you hand back the apartment, not the
          morning of your flight, so a no-show buyer does not leave you stuck. Anything unsold can be
          re-listed cheaply or donated rather than dumped.
        </p>
      </>
    ),
  },
]

export function getGuide(slug: string): Guide | null {
  return GUIDES.find((g) => g.slug === slug) ?? null
}

/** Which category slugs each guide is relevant to (for cross-linking). */
const GUIDE_CATEGORIES: Record<string, string[]> = {
  'how-to-sell-your-car-privately-in-the-uae': ['vehicles'],
  'how-much-is-my-car-worth-in-the-uae': ['vehicles'],
  'how-to-check-a-used-iphone-before-buying-in-the-uae': ['mobiles', 'electronics'],
  'how-much-is-my-iphone-worth-in-the-uae': ['mobiles', 'electronics'],
  'buying-used-furniture-in-the-uae-checklist': ['home-garden'],
  'selling-furniture-before-leaving-the-uae': ['home-garden'],
  'how-to-check-a-used-car-before-buying-in-the-uae': ['vehicles'],
  'how-to-rent-an-apartment-in-dubai-without-an-agent': ['property'],
  // General safety guide — relevant across the marketplace.
  'is-it-safe-to-buy-second-hand-online-in-dubai': [
    'vehicles',
    'property',
    'electronics',
    'mobiles',
    'home-garden',
    'fashion',
    'services',
    'hobbies',
    'business',
  ],
}

/** Guides relevant to a category, most-specific first, capped at `limit`. */
export function guidesForCategory(categorySlug: string, limit = 3): Guide[] {
  return GUIDES.filter((g) => (GUIDE_CATEGORIES[g.slug] ?? []).includes(categorySlug)).slice(
    0,
    limit,
  )
}

/**
 * Display topic for each guide — used to group the guides hub into scannable,
 * keyword-rich sections. Set explicitly (not derived from GUIDE_CATEGORIES)
 * because the cross-marketplace safety guide belongs under "Staying safe", not
 * whatever category happens to be listed first.
 */
const GUIDE_TOPIC: Record<string, string> = {
  'how-to-sell-your-car-privately-in-the-uae': 'Vehicles',
  'how-to-check-a-used-car-before-buying-in-the-uae': 'Vehicles',
  'how-much-is-my-car-worth-in-the-uae': 'Vehicles',
  'how-to-check-a-used-iphone-before-buying-in-the-uae': 'Electronics & mobiles',
  'how-much-is-my-iphone-worth-in-the-uae': 'Electronics & mobiles',
  'buying-used-furniture-in-the-uae-checklist': 'Home & garden',
  'selling-furniture-before-leaving-the-uae': 'Home & garden',
  'how-to-rent-an-apartment-in-dubai-without-an-agent': 'Property',
  'is-it-safe-to-buy-second-hand-online-in-dubai': 'Staying safe',
}

/** Order topics appear in on the hub. */
const TOPIC_ORDER = ['Vehicles', 'Property', 'Electronics & mobiles', 'Home & garden', 'Staying safe']

/** Rough read time (minutes) per guide, for the hub cards and article header. */
const READ_MINUTES: Record<string, number> = {
  'how-to-sell-your-car-privately-in-the-uae': 6,
  'how-to-check-a-used-car-before-buying-in-the-uae': 5,
  'how-much-is-my-car-worth-in-the-uae': 4,
  'how-to-check-a-used-iphone-before-buying-in-the-uae': 5,
  'how-much-is-my-iphone-worth-in-the-uae': 4,
  'buying-used-furniture-in-the-uae-checklist': 4,
  'selling-furniture-before-leaving-the-uae': 5,
  'how-to-rent-an-apartment-in-dubai-without-an-agent': 6,
  'is-it-safe-to-buy-second-hand-online-in-dubai': 5,
}

export function guideTopic(slug: string): string {
  return GUIDE_TOPIC[slug] ?? 'Guides'
}

export function guideReadMinutes(slug: string): number {
  return READ_MINUTES[slug] ?? 5
}

/** The flagship guide featured at the top of the hub. */
export const FEATURED_GUIDE_SLUG = 'how-to-sell-your-car-privately-in-the-uae'

/** Guides grouped by topic in TOPIC_ORDER (empty groups omitted). */
export function guidesByTopic(): { topic: string; guides: Guide[] }[] {
  return TOPIC_ORDER.map((topic) => ({
    topic,
    guides: GUIDES.filter((g) => guideTopic(g.slug) === topic),
  })).filter((group) => group.guides.length > 0)
}

/** Up to `limit` other guides sharing a slug's topic (for the article footer). */
export function relatedGuides(slug: string, limit = 3): Guide[] {
  const topic = guideTopic(slug)
  return GUIDES.filter((g) => g.slug !== slug && guideTopic(g.slug) === topic).slice(0, limit)
}

/** Display names for the top-level category slugs guides link into. */
const CATEGORY_LABELS: Record<string, string> = {
  vehicles: 'Vehicles',
  property: 'Property',
  electronics: 'Electronics',
  mobiles: 'Mobiles & Tablets',
  'home-garden': 'Home & Garden',
  fashion: 'Fashion & Beauty',
  services: 'Services',
  hobbies: 'Hobbies & Sports',
  business: 'Business & Industrial',
}

/**
 * The primary category a guide's "browse listings" CTA points at. The
 * cross-marketplace safety guide has no single category, so it returns null and
 * the article falls back to a generic browse-all CTA.
 */
export function guidePrimaryCategory(slug: string): { slug: string; label: string } | null {
  if (guideTopic(slug) === 'Staying safe') return null
  const catSlug = (GUIDE_CATEGORIES[slug] ?? [])[0]
  if (!catSlug) return null
  return { slug: catSlug, label: CATEGORY_LABELS[catSlug] ?? catSlug }
}
