/**
 * lib/seo/categoryContent — unique, human-written SEO copy for each top-level
 * category, reused by both the category pages (/category/[slug]) and the
 * category-in-city landing pages (/category/[slug]/[city]).
 *
 * Why this exists: a marketplace category page that is just a grid of listings
 * behind one boilerplate line gives search engines almost nothing to rank. The
 * intro copy + FAQs below are the indexable, genuinely useful content that lets
 * these pages compete for "{category} for sale in {city}" queries even while
 * live inventory is still thin. Keep the copy accurate and non-spammy.
 */

type CategorySeo = {
  /** One-line lead used in <meta description> and the intro's first sentence. */
  lead: string
  /** Supporting paragraph (buying context, what to check, price feel). */
  detail: string
  /** Popular things people search for within this category (used in copy). */
  popular: string[]
  /** Category-specific buyer FAQs. {city} is substituted at render time. */
  faqs: { question: string; answer: string }[]
}

const CATEGORY_SEO: Record<string, CategorySeo> = {
  vehicles: {
    lead: 'Buy and sell used cars, motorcycles, auto parts and boats across {place}.',
    detail:
      'From daily-driver sedans and family SUVs to motorcycles, spare parts and heavy vehicles, Query & Buy connects private sellers and buyers directly — no dealer markup. Always check the mileage, service history and Emirates Vehicle Gate (RTA) status before you commit, and arrange to view the vehicle in person.',
    popular: ['Toyota', 'Nissan', 'used SUVs', 'motorcycles', 'car spare parts'],
    faqs: [
      {
        question: 'How do I buy a used car safely in {city}?',
        answer:
          'View the car in person, verify the mileage and service history, confirm there are no outstanding fines or loans on the plate, and complete the transfer through an official RTA / traffic department centre. Query & Buy keeps your contact details private until you both agree to proceed.',
      },
      {
        question: 'Are the vehicle prices on Query & Buy negotiable?',
        answer:
          'Many private sellers mark their listings as negotiable. You can message the seller through the app to make an offer before meeting — pricing is shown upfront in AED with no hidden fees.',
      },
      {
        question: 'What paperwork do I need to sell my car in {city}?',
        answer:
          'You will typically need the vehicle registration (mulkiya), your Emirates ID, and a clear vehicle-inspection pass. Settle any outstanding fines before the ownership transfer.',
      },
    ],
  },
  property: {
    lead: 'Find apartments, villas, rooms and commercial property to rent or buy in {place}.',
    detail:
      'Browse flats for rent, villas for sale, shared rooms and commercial units listed directly by owners and residents. Confirm the RERA/Ejari details, the exact community and any agency fees before you sign, and view the unit in person where possible.',
    popular: ['apartments for rent', 'villas for sale', 'shared rooms', 'studios', 'commercial space'],
    faqs: [
      {
        question: 'How do I rent an apartment in {city}?',
        answer:
          'Shortlist listings in your budget and community, message the lister to arrange a viewing, and check the Ejari/RERA registration and what the rent includes (chiller, maintenance) before signing a tenancy contract.',
      },
      {
        question: 'Can I list my property directly without an agent?',
        answer:
          'Yes. Query & Buy lets owners and current tenants list property directly. Add clear photos and the community name, and your contact details stay private until you choose to share them.',
      },
      {
        question: 'Are prices shown as yearly or monthly rent?',
        answer:
          'Property listings show the price the lister set in AED. Message the lister to confirm whether rent is quoted per year, the number of cheques accepted, and any deposit.',
      },
    ],
  },
  electronics: {
    lead: 'Buy and sell used laptops, TVs, gaming consoles and cameras in {place}.',
    detail:
      'Computers, TVs and audio, gaming gear and cameras from people upgrading their kit — usually well below retail. Test the item on the spot, check for a warranty or original box, and confirm the exact model and condition with the seller first.',
    popular: ['laptops', 'PlayStation 5', 'gaming PCs', 'cameras', 'smart TVs'],
    faqs: [
      {
        question: 'How do I check used electronics before buying in {city}?',
        answer:
          'Meet in a public place, power the device on, test the key functions (screen, ports, battery, controllers), and confirm the model and any remaining warranty. Ask for the original box and accessories where possible.',
      },
      {
        question: 'Is it cheaper to buy second-hand electronics on Query & Buy?',
        answer:
          'Used laptops, consoles and cameras from private sellers are typically priced well below retail. Prices are listed upfront in AED and many sellers accept reasonable offers.',
      },
    ],
  },
  mobiles: {
    lead: 'Buy and sell used iPhones, Android phones and tablets across {place}.',
    detail:
      'Second-hand smartphones and tablets, from the latest iPhones to Samsung Galaxy and iPad models. Before buying, verify the IMEI is clean, the phone is not iCloud/Google locked, and the battery health is acceptable — then test it in person.',
    popular: ['iPhone', 'Samsung Galaxy', 'iPad', 'Android phones', 'tablets'],
    faqs: [
      {
        question: 'How do I make sure a used iPhone in {city} is not locked?',
        answer:
          'Ask the seller to remove their iCloud/Apple account and sign out before you meet, then confirm the phone activates cleanly on your own SIM. Check the IMEI is not blacklisted and review the battery health in Settings.',
      },
      {
        question: 'What should I check when buying a second-hand phone?',
        answer:
          'Test calls, Wi-Fi, cameras, Face/Touch ID and charging in person, confirm the IMEI, and check for screen or frame damage. Prices are shown upfront in AED and are often negotiable.',
      },
    ],
  },
  'home-garden': {
    lead: 'Buy and sell used furniture, appliances, home decor and garden items in {place}.',
    detail:
      'Sofas, beds, dining sets, white goods and garden furniture from homes across the Emirates — ideal when moving in, moving out or upgrading. Check dimensions and condition, and agree pickup or delivery with the seller before you commit.',
    popular: ['sofas', 'beds', 'refrigerators', 'washing machines', 'dining tables'],
    faqs: [
      {
        question: 'How do I arrange delivery for used furniture in {city}?',
        answer:
          'Agree pickup or delivery directly with the seller through the app. Many sellers can help arrange a mover for larger items — confirm the cost and timing before you finalise.',
      },
      {
        question: 'Is used furniture a good deal on Query & Buy?',
        answer:
          'People relocating often sell quality furniture and appliances at a fraction of retail. Check the measurements and condition photos, and message the seller with any questions before viewing.',
      },
    ],
  },
  fashion: {
    lead: 'Buy and sell pre-owned fashion, watches, bags and beauty items in {place}.',
    detail:
      'Clothing, shoes, watches, designer bags and beauty products in new or gently used condition. For higher-value items like watches and designer bags, ask for proof of authenticity and clear photos of any serial numbers before you meet.',
    popular: ['designer bags', 'watches', 'sneakers', 'abayas', 'sunglasses'],
    faqs: [
      {
        question: 'How do I verify a designer item is authentic in {city}?',
        answer:
          'Ask the seller for the original receipt, dust bag, serial or model numbers and detailed photos. Meet in person to inspect stitching, hardware and packaging before paying.',
      },
      {
        question: 'Can I sell my pre-loved clothes and accessories here?',
        answer:
          'Yes. Snap a few photos and Query & Buy helps generate the title, description and a suggested price in seconds — you review and publish. Your contact details stay private until a deal is agreed.',
      },
    ],
  },
  services: {
    lead: 'Find local services — moving, cleaning, repairs and more — across {place}.',
    detail:
      'Connect with independent service providers for home moving, cleaning, maintenance, tutoring and business services. Confirm exactly what is included, the total price and timing with the provider before booking.',
    popular: ['movers', 'cleaning', 'AC maintenance', 'handyman', 'tutoring'],
    faqs: [
      {
        question: 'How do I book a service in {city}?',
        answer:
          'Message the provider through the app to describe what you need, agree the scope and price, and arrange a time. Details are set directly between you and the provider.',
      },
      {
        question: 'Are service prices fixed?',
        answer:
          'Providers list an indicative price in AED. Confirm the final quote and what it includes before the work starts, as it can vary with the size and scope of the job.',
      },
    ],
  },
  hobbies: {
    lead: 'Buy and sell sports gear, hobby equipment and kids items in {place}.',
    detail:
      'Bicycles, gym and sports equipment, musical instruments, toys, strollers and other kids gear from families across the UAE. Check sizing, condition and safety (especially for kids items) and test moving parts before you buy.',
    popular: ['bicycles', 'gym equipment', 'strollers', 'toys', 'musical instruments'],
    faqs: [
      {
        question: 'Where can I buy used kids items and toys in {city}?',
        answer:
          'Families regularly list strollers, car seats, toys and clothes their children have outgrown. Check the condition, expiry (for car seats) and completeness, and view in person before buying.',
      },
      {
        question: 'Can I find used bicycles and gym equipment nearby?',
        answer:
          'Yes — browse this category and filter by emirate to find listings close to you. Prices are shown upfront in AED and many sellers accept offers.',
      },
    ],
  },
  business: {
    lead: 'Buy and sell business, office and industrial equipment across {place}.',
    detail:
      'Office furniture, restaurant and retail equipment, machinery and industrial tools from businesses upgrading or closing down. Confirm the specification, working condition and any warranty, and arrange inspection before purchase.',
    popular: ['office furniture', 'restaurant equipment', 'machinery', 'shop fittings', 'tools'],
    faqs: [
      {
        question: 'Can I buy commercial and office equipment in {city}?',
        answer:
          'Yes. Businesses list office furniture, catering and retail equipment and machinery directly. Confirm the specs and condition with the seller and inspect before buying.',
      },
      {
        question: 'Is Query & Buy suitable for selling business assets?',
        answer:
          'It is a fast way to reach local buyers for surplus or end-of-life business assets. Add clear photos and specs, and your contact details stay private until you agree a deal.',
      },
    ],
  },
}

/** Generic fallback for any category slug not in the map above. */
function fallback(name: string): CategorySeo {
  return {
    lead: `Buy and sell ${name} across {place} on Query & Buy.`,
    detail:
      `Browse ${name} listed directly by people across the UAE. Prices are shown upfront in AED with no hidden fees, and your contact details stay private until you and the seller agree to connect.`,
    popular: [],
    faqs: [
      {
        question: `How do I buy ${name} in {city}?`,
        answer:
          'Browse the listings, message the seller through the app to ask questions or make an offer, and arrange to meet or view the item before you complete the purchase.',
      },
    ],
  }
}

function seoFor(slug: string, name: string): CategorySeo {
  return CATEGORY_SEO[slug] ?? fallback(name)
}

function place(city?: string | null): string {
  return city ? city : 'the UAE'
}

/** Intro paragraphs (lead + detail) for a category or category-in-city page. */
export function categoryIntro(
  slug: string,
  name: string,
  city?: string | null,
): { lead: string; detail: string } {
  const seo = seoFor(slug, name)
  const p = place(city)
  return {
    lead: seo.lead.replace('{place}', p),
    detail: seo.detail,
  }
}

/** Unique meta description for a category or category-in-city page (≤ ~160 chars). */
export function categoryMetaDescription(slug: string, name: string, city?: string | null): string {
  const seo = seoFor(slug, name)
  const base = seo.lead.replace('{place}', place(city))
  const suffix = ' Prices in AED, no hidden fees.'
  return (base + suffix).slice(0, 160)
}

/** Category-specific FAQs with {city} substituted (falls back to "the UAE"). */
export function categoryFaqs(
  slug: string,
  name: string,
  city?: string | null,
): { question: string; answer: string }[] {
  const seo = seoFor(slug, name)
  const c = city ?? 'the UAE'
  return seo.faqs.map((f) => ({
    question: f.question.replaceAll('{city}', c),
    answer: f.answer.replaceAll('{city}', c),
  }))
}

/** Popular search terms within a category (for supporting copy / internal links). */
export function categoryPopular(slug: string, name: string): string[] {
  return seoFor(slug, name).popular
}
