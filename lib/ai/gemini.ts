import type {
  AiCategory,
  AiImageInput,
  AiProvider,
  NegotiationContext,
  RawListingDraft,
  RawNegotiation,
  RawSearchParse,
  SearchParseContext,
} from '@/lib/ai/provider'

const MODEL = 'gemini-2.5-flash'
const endpoint = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`

// ---- listing-generation schema ----
const confidentField = (type: string) => ({
  type: 'OBJECT',
  properties: { value: { type, nullable: true }, confidence: { type: 'NUMBER' } },
  required: ['value', 'confidence'],
})

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    overall_confidence: { type: 'NUMBER' },
    product_type: confidentField('STRING'),
    category_slug: confidentField('STRING'),
    brand: confidentField('STRING'),
    color: confidentField('STRING'),
    condition: confidentField('STRING'),
    key_attributes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          value: { type: 'STRING' },
          confidence: { type: 'NUMBER' },
        },
        required: ['name', 'value', 'confidence'],
      },
    },
    title: confidentField('STRING'),
    description: confidentField('STRING'),
    pricing: {
      type: 'OBJECT',
      properties: {
        quick_sale_aed: { type: 'NUMBER', nullable: true },
        fair_market_aed: { type: 'NUMBER', nullable: true },
        premium_aed: { type: 'NUMBER', nullable: true },
        confidence: { type: 'NUMBER' },
        reasoning: { type: 'STRING', nullable: true },
      },
      required: ['quick_sale_aed', 'fair_market_aed', 'premium_aed', 'confidence', 'reasoning'],
    },
  },
  required: [
    'overall_confidence',
    'product_type',
    'category_slug',
    'brand',
    'color',
    'condition',
    'key_attributes',
    'title',
    'description',
    'pricing',
  ],
}

// ---- conversational-search schema ----
const SEARCH_SCHEMA = {
  type: 'OBJECT',
  properties: {
    query: { type: 'STRING', nullable: true },
    category_slug: { type: 'STRING', nullable: true },
    emirate: { type: 'STRING', nullable: true },
    condition: { type: 'STRING', nullable: true },
    min_price_aed: { type: 'NUMBER', nullable: true },
    max_price_aed: { type: 'NUMBER', nullable: true },
    sort: { type: 'STRING', nullable: true },
  },
  required: [
    'query',
    'category_slug',
    'emirate',
    'condition',
    'min_price_aed',
    'max_price_aed',
    'sort',
  ],
}

// ---- negotiation schema ----
const NEGOTIATION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    suggested_offer_aed: { type: 'NUMBER', nullable: true },
    market_average_aed: { type: 'NUMBER', nullable: true },
    reasons: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['suggested_offer_aed', 'market_average_aed', 'reasons'],
}

function buildNegotiationPrompt(ctx: NegotiationContext): string {
  const offerLine =
    ctx.lastOfferAed != null
      ? `The most recent offer on the table is AED ${ctx.lastOfferAed}.`
      : 'No offer has been made yet.'
  const goal =
    ctx.role === 'buyer'
      ? 'Suggest a fair opening/next OFFER the buyer should propose — below asking but realistic enough to be taken seriously.'
      : 'Suggest a fair COUNTER the seller should propose — above the buyer offer but realistic for a quick sale.'
  return `You are a pragmatic UAE second-hand marketplace negotiation advisor. Return ONLY a JSON object. You ADVISE; you never send anything.

Item: "${ctx.listingTitle}"
Condition: ${ctx.condition ?? 'unknown'}
Asking price: AED ${ctx.askingPriceAed}
Days listed: ${ctx.daysListed}
${offerLine}
You are advising the ${ctx.role.toUpperCase()}.

${goal}

- market_average_aed: your estimate of the typical UAE resale price for this item/condition (whole AED), or null if unsure.
- suggested_offer_aed: a single whole-AED number that is a sensible, respectful ${ctx.role === 'buyer' ? 'offer' : 'counter'} given the asking price, condition, market average, and how long it has been listed (a long-listed item justifies a lower offer).
- reasons: 2–3 short bullet strings (max ~10 words each) justifying it, e.g. "Below 19-day-old listing", "Matches UAE market average", "Good condition".

Return ONLY the JSON object.`
}

function buildListingPrompt(categories: AiCategory[]): string {
  const list = categories.map((c) => `${c.slug} (${c.name})`).join(', ')
  return `You are an expert UAE marketplace listing assistant. Analyze the photo(s), which show ONE item for sale, and return a single JSON object.

Identify: product_type, brand, color, condition, the best category, and key attributes. Then write a marketplace title and description.

First set overall_confidence (integer 0–100): how confident you are that the photos show a single, real, physical, sellable product that you have correctly identified. Set it LOW (e.g. under 40) if the image is not a clear product photo — for example a digital illustration, screenshot, drawing, meme, blurry/dark image, or several unrelated items. Be honest; do not inflate it.

Rules:
- condition.value MUST be exactly one of: new, like_new, used, for_parts.
- category_slug.value MUST be exactly one slug from this list, or null if none fit: ${list}.
- title.value: concise and specific, max 80 characters, no emojis.
- description.value: 2–4 natural sentences in English highlighting brand, color, condition, and notable attributes a buyer cares about.
- confidence: an integer 0–100 for THAT field, based only on what the photos actually show. If unsure, still give your best guess but use a low confidence.
- key_attributes: 0–6 salient specs (e.g. {name:"Storage", value:"256GB"}).

Pricing (pricing object): estimate the item's resale value in the UAE second-hand market in AED, using the category, brand, condition, visible attributes, and typical UAE demand, across three tiers:
- quick_sale_aed: priced to sell within days (below market).
- fair_market_aed: the typical UAE resale price.
- premium_aed: the top of the realistic range for excellent condition / strong demand.
Use whole AED numbers and ensure quick_sale_aed <= fair_market_aed <= premium_aed. Set pricing.confidence to an integer 0–100, and pricing.reasoning to one short sentence explaining the basis (e.g. "Based on category, visible condition, and UAE resale demand."). If you genuinely cannot estimate a price, set the three amounts to null and use a low confidence.
Return ONLY the JSON object.`
}

function buildSearchPrompt(text: string, ctx: SearchParseContext): string {
  const cats = ctx.categories.map((c) => `${c.slug} (${c.name})`).join(', ')
  const ems = ctx.emirates.map((e) => `${e.value} (${e.label})`).join(', ')
  return `Convert a UAE marketplace shopper's natural-language request into structured search filters. Return ONLY a JSON object.

User request: "${text}"

Extract:
- query: the core product keywords ONLY, with location, price, and condition words removed (e.g. "iPhone", "office chair", "family SUV", "MacBook Pro"). null if there are none.
- category_slug: the single best-matching slug from this list, or null: ${cats}.
- emirate: one of these values (map city/emirate names, "near X" → X), or null: ${ems}.
- condition: one of [${ctx.conditions.join(', ')}] or null. "used"/"second-hand"/"pre-owned" → used; "brand new" → new.
- min_price_aed / max_price_aed: numeric AED bounds. "under"/"below"/"less than"/"up to" X → max; "over"/"above"/"from"/"at least" X → min; "between X and Y" → both. Treat "2k"=2000, "50k"=50000. null if not mentioned.
- sort: "price_asc" (cheapest/lowest first), "price_desc" (most expensive first), "newest" (newest/latest), or null.

Return ONLY the JSON object.`
}

/** Gemini 2.5 Flash implementation of the AiProvider interface. */
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini'

  private async generate(
    parts: unknown[],
    schema: object,
    temperature: number,
  ): Promise<unknown> {
    const key = process.env.GEMINI_API_KEY
    if (!key) throw new Error('AI is not configured (GEMINI_API_KEY is missing).')

    let res: Response
    try {
      res = await fetch(endpoint(key), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature,
          },
        }),
      })
    } catch {
      throw new Error('Could not reach the AI service. Check your connection and try again.')
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`AI service error (${res.status})${detail ? `: ${detail.slice(0, 160)}` : ''}`)
    }

    const data = await res.json()
    const text: string =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? '')
        .join('') ?? ''
    if (!text.trim()) throw new Error('The AI returned an empty response. Please try again.')

    try {
      return JSON.parse(text)
    } catch {
      throw new Error('The AI returned malformed data. Please try again.')
    }
  }

  async generateListingDraft(
    images: AiImageInput[],
    categories: AiCategory[],
  ): Promise<RawListingDraft> {
    const parts = [
      { text: buildListingPrompt(categories) },
      ...images.map((im) => ({ inlineData: { mimeType: im.mimeType, data: im.dataBase64 } })),
    ]
    return (await this.generate(parts, RESPONSE_SCHEMA, 0.4)) as RawListingDraft
  }

  async parseSearchQuery(text: string, ctx: SearchParseContext): Promise<RawSearchParse> {
    const parts = [{ text: buildSearchPrompt(text, ctx) }]
    return (await this.generate(parts, SEARCH_SCHEMA, 0.2)) as RawSearchParse
  }

  async suggestNegotiation(ctx: NegotiationContext): Promise<RawNegotiation> {
    const parts = [{ text: buildNegotiationPrompt(ctx) }]
    return (await this.generate(parts, NEGOTIATION_SCHEMA, 0.3)) as RawNegotiation
  }
}
