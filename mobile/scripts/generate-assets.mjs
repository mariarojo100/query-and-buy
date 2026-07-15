/**
 * Generate the app's image assets procedurally (no design tools needed):
 *   assets/icon.png           1024×1024  iOS icon (emerald field, magnifier mark)
 *   assets/adaptive-icon.png  1024×1024  Android foreground (transparent bg)
 *   assets/splash.png         2048×2048  splash (cream field, centered mark)
 *
 * The mark mirrors the web logo motif: a bold magnifier (the "Query") with a
 * gold dot in the lens (the find). Drawn with signed-distance functions +
 * 2×2 supersampling for clean edges. Run: node scripts/generate-assets.mjs
 */
import { PNG } from 'pngjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'assets')
mkdirSync(outDir, { recursive: true })

const EMERALD = [14, 90, 67]
const EMERALD_D = [10, 68, 51]
const CREAM = [250, 249, 246]
const GOLD = [200, 162, 74]
const WHITE = [255, 255, 255]

// --- signed distances (in unit space where the canvas is [0,1]²) ------------
function sdCircle(x, y, cx, cy, r) {
  return Math.hypot(x - cx, y - cy) - r
}
/** Capsule (rounded segment) from a→b with radius r. */
function sdSegment(x, y, ax, ay, bx, by, r) {
  const pax = x - ax, pay = y - ay
  const bax = bx - ax, bay = by - ay
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)))
  return Math.hypot(pax - bax * h, pay - bay * h) - r
}

/** Coverage (0..1) of the magnifier mark at unit point (x,y). Returns layer id. */
function mark(x, y) {
  // lens ring: circle at (0.44,0.44) r=0.20, stroke width 0.075
  const ring = Math.abs(sdCircle(x, y, 0.44, 0.44, 0.2)) - 0.0375
  // handle: from lens edge toward bottom-right
  const hd = sdSegment(x, y, 0.585, 0.585, 0.72, 0.72, 0.0375)
  // gold dot inside the lens
  const dot = sdCircle(x, y, 0.44, 0.44, 0.075)
  if (dot < 0) return 'gold'
  if (ring < 0 || hd < 0) return 'fg'
  return null
}

function render(size, { bg, fg, gold, transparent = false, scale = 1 }) {
  const png = new PNG({ width: size, height: size })
  const SS = 2 // supersample
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let rf = 0, gf = 0, bf = 0, af = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          // map to unit space, with the mark scaled about the center
          const ux = 0.5 + ((px + (sx + 0.5) / SS) / size - 0.5) / scale
          const uy = 0.5 + ((py + (sy + 0.5) / SS) / size - 0.5) / scale
          const layer = mark(ux, uy)
          let c = null, a = 1
          if (layer === 'gold') c = gold
          else if (layer === 'fg') c = fg
          else if (!transparent) c = bg
          else a = 0
          if (c) { rf += c[0]; gf += c[1]; bf += c[2]; af += a * 255 }
        }
      }
      const n = SS * SS
      const i = (py * size + px) * 4
      png.data[i] = rf / n
      png.data[i + 1] = gf / n
      png.data[i + 2] = bf / n
      png.data[i + 3] = af / n
    }
  }
  return PNG.sync.write(png)
}

// iOS icon: emerald field, white magnifier, gold dot (no alpha on bg)
writeFileSync(join(outDir, 'icon.png'), render(1024, { bg: EMERALD, fg: WHITE, gold: GOLD }))
console.log('assets/icon.png (1024², emerald)')

// Android adaptive foreground: transparent bg, emerald mark, scaled down so the
// launcher's mask (circle/squircle) never clips it (safe zone ≈ 66%).
writeFileSync(
  join(outDir, 'adaptive-icon.png'),
  render(1024, { bg: null, fg: EMERALD_D, gold: GOLD, transparent: true, scale: 0.62 }),
)
console.log('assets/adaptive-icon.png (1024², transparent fg)')

// Splash: cream field, emerald mark, smaller in the center
writeFileSync(
  join(outDir, 'splash.png'),
  render(2048, { bg: CREAM, fg: EMERALD, gold: GOLD, scale: 0.34 }),
)
console.log('assets/splash.png (2048², cream)')
