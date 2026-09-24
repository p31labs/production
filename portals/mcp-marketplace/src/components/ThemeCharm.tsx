import { useState } from 'react'
import {
  useThemeStore,
  resolveBrandTokens,
  THEME_TOKENS,
  type ThemeId,
  type BrandId,
  type AgeTier,
} from '@p31/design-core/theming/theme-store'

const WORLD_LABELS: Record<ThemeId, string> = {
  garden: 'Garden',
  ocean: 'Ocean',
  aurora: 'Aurora',
  zen: 'Zen',
  volt: 'Volt',
}

const BRANDS: BrandId[] = ['p31ca', 'phos', 'phosphorus31', 'willow', 'bonding']

const AGES: AgeTier[] = ['child', 'teen', 'adult']

/**
 * ThemeCharm — the workspace's appearance engine bridge.
 *
 * A QPJ-owned bridge over design-core's `useThemeStore`, mirroring the same
 * surface: brand × world × age × sensory. Changing any control re-applies the
 * token set via `useThemeEffects` (data-theme on <html>), so the starfield
 * recolors live through `--p31-star`.
 */
export function ThemeCharm({ className = '' }: { className?: string }) {
  const { theme, age, muted, warmLight, setTheme, setAge, setMuted, setWarmLight } = useThemeStore()
  const [brand, setBrand] = useState<BrandId>('p31ca')

  return (
    <div className={`charm charm--workspace ${className}`} aria-label="Appearance settings">
      {/* Brand */}
      <div className="charm-row" role="group" aria-label="Brand">
        <span className="charm-label">Brand</span>
        <div className="charm-chip-row">
          {BRANDS.map((b) => (
            <button
              key={b}
              type="button"
              className={`charm-chip${brand === b ? ' is-active' : ''}`}
              aria-pressed={brand === b}
              onClick={() => {
                setBrand(b)
                const tokens = resolveBrandTokens(b)
                for (const [k, v] of Object.entries(tokens)) {
                  document.documentElement.style.setProperty(k, v)
                }
              }}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* World */}
      <div className="charm-row" role="group" aria-label="World">
        <span className="charm-label">World</span>
        <div className="charm-chip-row">
          {(Object.keys(THEME_TOKENS) as ThemeId[]).map((id) => (
            <button
              key={id}
              type="button"
              className={`charm-chip${theme === id ? ' is-active' : ''}`}
              aria-pressed={theme === id}
              onClick={() => setTheme(id)}
            >
              {WORLD_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      {/* Age */}
      <div className="charm-row" role="group" aria-label="Age">
        <span className="charm-label">Age</span>
        <div className="charm-chip-row">
          {AGES.map((a) => (
            <button
              key={a}
              type="button"
              className={`charm-chip${age === a ? ' is-active' : ''}`}
              aria-pressed={age === a}
              onClick={() => setAge(a)}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Sensory */}
      <div className="charm-row" role="group" aria-label="Sensory">
        <span className="charm-label">Sensory</span>
        <label className="charm-toggle">
          <input type="checkbox" checked={muted} onChange={(e) => setMuted(e.target.checked)} />
          <span>Muted</span>
        </label>
        <label className="charm-toggle">
          <input type="checkbox" checked={warmLight} onChange={(e) => setWarmLight(e.target.checked)} />
          <span>Warm light</span>
        </label>
      </div>
    </div>
  )
}

export default ThemeCharm