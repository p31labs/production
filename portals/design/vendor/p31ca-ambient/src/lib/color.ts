/**
 * @file color.ts — color helpers for WebGL.
 *
 * THREE.Color cannot parse `oklch(...)` CSS values, but the theme
 * environments define their tokens as oklch. This module converts any CSS
 * color (oklch/hex/rgb) into a hex string THREE.Color accepts.
 *
 * Uses the browser's own CSS engine when available; falls back to hex.
 */

/**
 * Convert a CSS color value to a `#rrggbb` hex string.
 * Handles oklch(...), oklab(...), rgb(...), hsl(...), hex, and named colors.
 * Falls back to a provided default when the value is unusable.
 */
export function cssToHex(value: string | null | undefined, fallback = '#22d3ee'): string {
  if (!value) return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  // Already a hex shorthand we accept.
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) return trimmed
  try {
    if (typeof document !== 'undefined') {
      // The browser parses oklch()/oklab()/hsl() correctly.
      const probe = document.createElement('div')
      probe.style.color = trimmed
      if (probe.style.color) {
        const rgb = getComputedStyle(probe).color
        const m = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        if (m) {
          const r = Number(m[1])
          const g = Number(m[2])
          const b = Number(m[3])
          return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
        }
      }
    }
  } catch {
    /* fall through to the default */
  }
  return fallback
}

/**
 * Direct oklch → sRGB conversion without the DOM (for tests / edge cases).
 * Input: `oklch(L C H)` or `oklch(L C H / A)`, channels 0..1 (L,C) and H 0..360.
 * Returns a hex string. Not used when the DOM path is available; provided for
 * determinism in unit tests.
 */
export function oklchToHex(value: string, fallback = '#22d3ee'): string {
  const m = value.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
  if (!m) return fallback
  const L = Number(m[1])
  const C = Number(m[2])
  const H = (Number(m[3]) * Math.PI) / 180
  const a = Math.cos(H)
  const b = Math.sin(H)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l3 = l_ * l_ * l_
  const m3 = m_ * m_ * m_
  const s3 = s_ * s_ * s_
  const r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3
  const bv = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round((n * 255) + 0.5)))
  return `#${[clamp(r), clamp(g), clamp(bv)].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}