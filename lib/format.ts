/** Format a money amount stored as fils (1 AED = 100 fils) for display. */
export function formatPrice(fils: number, currency = 'AED'): string {
  const amount = fils / 100
  const formatted = new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
  return `${currency} ${formatted}`
}

/** Short "time ago" for listing cards (e.g. "3h ago", "2d ago"). */
export function formatRelativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  const diffMs = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(diffMs)) return null
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  const wk = Math.floor(day / 7)
  if (wk < 5) return `${wk}w ago`
  const mo = Math.floor(day / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(day / 365)}y ago`
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

/** Day label for chat date separators: "Today" / "Yesterday" / "12 June". */
export function formatDateSeparator(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return d.toLocaleDateString('en-AE', {
    day: 'numeric',
    month: 'long',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })
}

/** Parse an AED string/number into integer fils. Returns null if invalid. */
export function aedToFils(input: string | number): number | null {
  const aed = typeof input === 'number' ? input : Number(input)
  if (!Number.isFinite(aed) || aed < 0) return null
  return Math.round(aed * 100)
}
