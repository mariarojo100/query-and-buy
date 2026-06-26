/**
 * Provider-agnostic AI listing generation.
 *
 * The product code depends only on the `AiProvider` interface and these types.
 * Swap providers via the AI_PROVIDER env var (default: gemini). Adding OpenAI or
 * Claude later means implementing `AiProvider` and registering it in getProvider().
 */
import { GeminiProvider } from '@/lib/ai/gemini'

/** A photo passed to the model, base64-encoded (no data: prefix). */
export type AiImageInput = { mimeType: string; dataBase64: string }

/** A model-extracted value with a 0–100 confidence score. */
export type Confident<T> = { value: T | null; confidence: number }

export type KeyAttribute = { name: string; value: string; confidence: number }

/** UAE resale price tiers (AED) + overall confidence and one-line reasoning. */
export type PriceSuggestion = {
  quick_sale_aed: number | null
  fair_market_aed: number | null
  premium_aed: number | null
  confidence: number
  reasoning: string | null
}

/** Raw, un-thresholded result from a provider. */
export type RawListingDraft = {
  /** 0–100: how confident the model is it identified a real, sellable product. */
  overall_confidence: number
  product_type: Confident<string>
  category_slug: Confident<string>
  brand: Confident<string>
  color: Confident<string>
  condition: Confident<string>
  key_attributes: KeyAttribute[]
  title: Confident<string>
  description: Confident<string>
  pricing: PriceSuggestion
}

export type AiCategory = { slug: string; name: string }

/** Natural-language search parsed into structured filter candidates. */
export type RawSearchParse = {
  query: string | null
  category_slug: string | null
  emirate: string | null
  condition: string | null
  min_price_aed: number | null
  max_price_aed: number | null
  sort: string | null
}

export type SearchParseContext = {
  categories: AiCategory[]
  emirates: { value: string; label: string }[]
  conditions: string[]
}

/** Context for an in-chat negotiation suggestion (Sprint 9). */
export type NegotiationContext = {
  role: 'buyer' | 'seller'
  listingTitle: string
  askingPriceAed: number
  condition: string | null
  daysListed: number
  /** The most recent offer on the table (AED), if any. */
  lastOfferAed: number | null
}

/** A suggested price + market estimate + short bullet reasons. Advisory only. */
export type RawNegotiation = {
  suggested_offer_aed: number | null
  market_average_aed: number | null
  reasons: string[]
}

export interface AiProvider {
  readonly name: string
  /** Analyze 1–5 photos of one item and return a structured draft with confidences. */
  generateListingDraft(images: AiImageInput[], categories: AiCategory[]): Promise<RawListingDraft>
  /** Parse a plain-English marketplace query into structured filter candidates. */
  parseSearchQuery(text: string, ctx: SearchParseContext): Promise<RawSearchParse>
  /** Suggest a fair offer/counter with reasoning. Never auto-sends. */
  suggestNegotiation(ctx: NegotiationContext): Promise<RawNegotiation>
}

/** Fields below this confidence are dropped (left empty for the user). */
export const CONFIDENCE_THRESHOLD = 70

export function getProvider(): AiProvider {
  const which = (process.env.AI_PROVIDER ?? 'gemini').toLowerCase()
  switch (which) {
    case 'gemini':
      return new GeminiProvider()
    // case 'openai': return new OpenAIProvider()   // implement AiProvider
    // case 'claude': return new ClaudeProvider()   // implement AiProvider
    default:
      throw new Error(`Unsupported AI provider: "${which}".`)
  }
}
