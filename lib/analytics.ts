/**
 * Provider-agnostic analytics. Product code calls `track(event, props)`; the
 * active provider decides what to do. Swap providers (PostHog, GA4, Segment, …)
 * by calling `setAnalyticsProvider` in a client init — no call sites change.
 */
export type AnalyticsEvent =
  | 'listing_created'
  | 'listing_viewed'
  | 'search_performed'
  | 'offer_sent'
  | 'offer_accepted'
  | 'order_confirmed'
  | 'review_submitted'
  | 'profile_viewed'

export interface AnalyticsProvider {
  capture(event: AnalyticsEvent, props?: Record<string, unknown>): void
}

const consoleProvider: AnalyticsProvider = {
  capture(event, props) {
    if (process.env.NODE_ENV !== 'production')
      console.debug('[analytics]', event, props ?? {})
  },
}

/** No-op in production until a real provider is wired (keeps zero overhead). */
const noopProvider: AnalyticsProvider = { capture() {} }

let provider: AnalyticsProvider =
  process.env.NODE_ENV === 'production' ? noopProvider : consoleProvider

export function setAnalyticsProvider(p: AnalyticsProvider) {
  provider = p
}

/** Fire an analytics event. Never throws — analytics must not break product flows. */
export function track(event: AnalyticsEvent, props?: Record<string, unknown>) {
  try {
    provider.capture(event, props)
  } catch {
    /* swallow */
  }
}
