'use server'

import { createClient } from '@/utils/supabase/server'
import {
  getProvider,
  CONFIDENCE_THRESHOLD,
  type AiImageInput,
  type Confident,
} from '@/lib/ai/provider'
import { CONDITION_VALUES } from '@/lib/listings/conditions'

export type AiPricing = {
  quickSaleAed: number | null
  fairMarketAed: number | null
  premiumAed: number | null
  confidence: number
  reasoning: string | null
}

export type AiDraft = {
  title: string
  description: string
  categoryId: string | null
  condition: string | null
  /** Everything the model identified, with confidence — shown for transparency. */
  detected: { label: string; value: string; confidence: number }[]
  /** Human labels of form fields left empty due to low confidence. */
  lowConfidence: string[]
  /** AI price tiers (AED), or null if the model couldn't estimate / was unsure. */
  pricing: AiPricing | null
  /** 0–100 overall identification confidence. */
  overallConfidence: number
  /** Set when overall confidence is too low — nothing is auto-filled. */
  warning: string | null
}

const LOW_CONFIDENCE_WARNING =
  'AI could not confidently identify this product. Please upload clearer product photos.'

export type AiDraftResult = { ok: true; draft: AiDraft } | { ok: false; error: string }

/** Above-threshold + non-empty? */
function confident(fc: Confident<string> | undefined): string | null {
  if (!fc || typeof fc.confidence !== 'number' || fc.confidence < CONFIDENCE_THRESHOLD) return null
  const v = fc.value == null ? '' : String(fc.value).trim()
  return v === '' ? null : v
}

/** Generate an editable listing draft from photos. Never throws — returns {ok:false}. */
export async function generateListingDraft(images: AiImageInput[]): Promise<AiDraftResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in.' }
  if (!images?.length) return { ok: false, error: 'Add at least one photo first.' }

  const photos = images.slice(0, 5) // req: 1–5 photos

  const { data: cats } = await supabase
    .from('categories')
    .select('id, slug, name_en')
    .eq('is_active', true)
  const categories = (cats ?? []) as { id: string; slug: string; name_en: string }[]
  const slugToId = new Map(categories.map((c) => [c.slug, c.id]))

  let raw
  try {
    raw = await getProvider().generateListingDraft(
      photos,
      categories.map((c) => ({ slug: c.slug, name: c.name_en })),
    )
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'AI generation failed.' }
  }

  // --- apply the 70% threshold to fields that flow into the form ---
  const title = (confident(raw.title) ?? '').slice(0, 100)
  const description = (confident(raw.description) ?? '').slice(0, 2000)

  const conditionRaw = confident(raw.condition)
  const condition = conditionRaw && CONDITION_VALUES.includes(conditionRaw) ? conditionRaw : null

  // The retired "Jobs" category maps to the closest valid one if the model returns it.
  const rawSlug = confident(raw.category_slug)
  const slug = rawSlug === 'jobs' ? 'services' : rawSlug
  const categoryId = slug && slugToId.has(slug) ? slugToId.get(slug)! : null

  // --- transparency panel: show everything the model saw, with confidence ---
  const detected: AiDraft['detected'] = []
  const add = (label: string, fc?: Confident<string>) => {
    if (fc?.value && String(fc.value).trim()) {
      detected.push({ label, value: String(fc.value), confidence: Math.round(fc.confidence ?? 0) })
    }
  }
  add('Product', raw.product_type)
  add('Brand', raw.brand)
  add('Color', raw.color)
  add('Condition', raw.condition)
  for (const a of raw.key_attributes ?? []) {
    if (a?.value) {
      detected.push({
        label: a.name || 'Detail',
        value: String(a.value),
        confidence: Math.round(a.confidence ?? 0),
      })
    }
  }

  const lowConfidence: string[] = []
  if (!title) lowConfidence.push('title')
  if (!description) lowConfidence.push('description')
  if (!categoryId) lowConfidence.push('category')
  if (!condition) lowConfidence.push('condition')

  // --- pricing (whole AED, positive; null if the model abstained) ---
  const aed = (n: unknown): number | null =>
    typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.round(n) : null
  const p = raw.pricing
  const quick = aed(p?.quick_sale_aed)
  const fair = aed(p?.fair_market_aed)
  const premium = aed(p?.premium_aed)
  const pricing: AiPricing | null =
    p && (quick || fair || premium)
      ? {
          quickSaleAed: quick,
          fairMarketAed: fair,
          premiumAed: premium,
          confidence: Math.max(0, Math.min(100, Math.round(p.confidence ?? 0))),
          reasoning: p.reasoning ? String(p.reasoning).trim() : null,
        }
      : null

  // --- OVERALL confidence gate ---
  // Effective overall = the model's own overall_confidence, but never higher than
  // its confidence that it identified WHAT the product is. This stops a confidently
  // worded title from slipping through when the item itself wasn't recognized
  // (e.g. a digital illustration scored 10%).
  const productConf =
    typeof raw.product_type?.confidence === 'number' ? raw.product_type.confidence : 0
  const modelOverall =
    typeof raw.overall_confidence === 'number' ? raw.overall_confidence : productConf
  const overallConfidence = Math.max(
    0,
    Math.min(100, Math.round(Math.min(modelOverall, productConf))),
  )
  const isConfident = overallConfidence >= CONFIDENCE_THRESHOLD

  if (!isConfident) {
    // Nothing auto-fills. Keep `detected` so the user sees what the AI guessed,
    // but title/description/category/condition stay blank and no pricing is shown.
    return {
      ok: true,
      draft: {
        title: '',
        description: '',
        categoryId: null,
        condition: null,
        detected,
        lowConfidence: ['title', 'description', 'category', 'condition'],
        pricing: null,
        overallConfidence,
        warning: LOW_CONFIDENCE_WARNING,
      },
    }
  }

  return {
    ok: true,
    draft: {
      title,
      description,
      categoryId,
      condition,
      detected,
      lowConfidence,
      pricing,
      overallConfidence,
      warning: null,
    },
  }
}
