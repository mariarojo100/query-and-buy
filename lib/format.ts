/** Format a money amount stored as fils (1 AED = 100 fils) for display. */
export function formatPrice(fils: number, currency = 'AED'): string {
  const amount = fils / 100
  const formatted = new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
  return `${currency} ${formatted}`
}

/** Compact timestamp for chat/inbox: time today, weekday this week, else date. */
export function formatChatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-AE', { hour: 'numeric', minute: '2-digit' })
  }
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays < 7) return d.toLocaleDateString('en-AE', { weekday: 'short' })
  return d.toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })
}

/** Parse an AED string/number into integer fils. Returns null if invalid. */
export function aedToFils(input: string | number): number | null {
  const aed = typeof input === 'number' ? input : Number(input)
  if (!Number.isFinite(aed) || aed < 0) return null
  return Math.round(aed * 100)
}
