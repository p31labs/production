import { useEffect, useRef, useState } from 'react';
import { useThemeStore, resolveBrandTokens, THEME_TOKENS, type ThemeId, type BrandId } from '@p31ca/design-core/theming/theme-store';
import { useQpjStore } from '../store/useQpjStore';
import type { QpjTheme } from '../store/useQpjStore';

const BRANDS: BrandId[] = ['p31ca', 'phos', 'phosphorus31', 'willow', 'bonding'];

const WORLD_LABELS: Record<ThemeId, string> = {
  garden: 'Garden',
  ocean: 'Ocean',
  aurora: 'Aurora',
  zen: 'Zen',
  volt: 'Volt',
};

const AGES: ('child' | 'teen' | 'adult')[] = ['child', 'teen', 'adult'];

const PACKS: { id: QpjTheme; icon: string; label: string }[] = [
  { id: 'space', icon: '⭐', label: 'Space' },
  { id: 'lantern', icon: '🏮', label: 'Lantern' },
];

/**
 * ThemeCharm — QPJ's appearance picker.
 *
 * A QPJ-owned bridge over design-core's `useThemeStore` (mirroring the
 * CommandPalette pattern): the pack row (Space ⭐ / Lantern 🏮) chooses the
 * QPJ look via the persisted `qpjTheme` store, while brand × world × age ×
 * sensory rows reuse design-core's theme-store + chrome.css classes so the
 * sovereign chrome stays canonical. See docs/15-DIVERGENCES.md.
 */
export function ThemeCharm({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState<BrandId>('p31ca');
  const ref = useRef<HTMLDivElement>(null);
  const { theme, age, muted, warmLight, setTheme, setAge, setMuted, setWarmLight } = useThemeStore();
  const qpjTheme = useQpjStore((s) => s.qpjTheme);
  const setQpjTheme = useQpjStore((s) => s.setQpjTheme);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const applyBrand = (next: BrandId) => {
    setBrand(next);
    const tokens = resolveBrandTokens(next);
    const root = document.documentElement;
    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(key, value as string);
    });
  };

  const swatch = (id: ThemeId) => THEME_TOKENS[id]['--p31-accent'];

  return (
    <div ref={ref} className={`chameleon ${className}`.trim()}>
      <button
        className="chameleon-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Theme pack and adaptive appearance"
        title="ThemeCharm — pack, brand, world, and sensory controls"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3a9 9 0 0 0-9 9h4a5 5 0 0 1 5 5v.4a3.6 3.6 0 0 1-3.6 3.6H12a9 9 0 1 0 0-18z" />
        </svg>
        <span className="chameleon-dot" style={{ background: swatch(theme) }} aria-hidden="true" />
      </button>

      {open && (
        <div className="chameleon-panel" style={{ width: 264 }} role="dialog" aria-label="Theme pack and adaptive appearance">
          <span className="chameleon-label">Pack</span>
          <div className="chameleon-row" role="group" aria-label="Theme packs" defaultValue={qpjTheme}>
            {PACKS.map((p) => (
              <button
                key={p.id}
                className={`world-dot pack-dot${qpjTheme === p.id ? ' is-active' : ''}`}
                onClick={() => setQpjTheme(p.id)}
                aria-pressed={qpjTheme === p.id}
                title={`${p.icon} ${p.label}${qpjTheme === p.id ? ' (current)' : ''}`}
              >
                <span aria-hidden="true">{p.icon}</span>
                <span className="sr-only">{p.label}</span>
              </button>
            ))}
          </div>

          <span className="chameleon-label">Brand</span>
          <div className="chameleon-row chameleon-brands" role="group" aria-label="Brand">
            {BRANDS.map((b) => (
              <button
                key={b}
                className={`brand-chip${brand === b ? ' is-active' : ''}`}
                onClick={() => applyBrand(b)}
                aria-pressed={brand === b}
                title={brand === b ? `${b} (current)` : b}
              >
                {b}
              </button>
            ))}
          </div>

          <span className="chameleon-label">World</span>
          <div className="chameleon-row" role="group" aria-label="Color world">
            {(Object.keys(THEME_TOKENS) as ThemeId[]).map((id) => (
              <button
                key={id}
                className={`world-dot ${theme === id ? 'is-active' : ''}`}
                style={{ background: swatch(id) }}
                onClick={() => setTheme(id)}
                aria-pressed={theme === id}
                title={`${WORLD_LABELS[id]}${theme === id ? ' (current)' : ''}`}
              >
                <span className="sr-only">{WORLD_LABELS[id]}</span>
              </button>
            ))}
          </div>

          <div className="chameleon-row chameleon-seg" role="group" aria-label="Age tier">
            {AGES.map((a) => (
              <button
                key={a}
                className={`seg ${age === a ? 'is-active' : ''}`}
                onClick={() => setAge(a)}
                aria-pressed={age === a}
              >
                {a}
              </button>
            ))}
          </div>

          <div className="chameleon-row chameleon-toggles">
            <label className="toggle">
              <input type="checkbox" checked={muted} onChange={(e) => setMuted(e.target.checked)} />
              <span>Muted</span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={warmLight} onChange={(e) => setWarmLight(e.target.checked)} />
              <span>Warm dusk</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemeCharm;