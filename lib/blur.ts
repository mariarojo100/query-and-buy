/**
 * A tiny warm-neutral SVG used as a `blurDataURL` placeholder for listing
 * images. Encoded as a data URL (no Buffer) so it's safe in both server and
 * client components. Prevents blank flashes and layout shift while images load.
 */
export const BLUR_DATA_URL =
  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='10'%3E%3Crect width='8' height='10' fill='%23ebece8'/%3E%3C/svg%3E"
