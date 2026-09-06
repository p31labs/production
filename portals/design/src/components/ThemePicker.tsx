import { useEffect, useRef, useState } from 'react';
import { Palette } from 'lucide-react';
import { useThemeStore, type ThemeId } from '@p31/design-core/theming/theme-store';

const WORLDS: Record<ThemeId, { label: string; swatch: string }> = {
  ocean: { label: 'Ocean', swatch: 'oklch(65% 0.18 195)' },
  garden: { label: 'Garden', swatch: 'oklch(69% 0.14 45)' },
  aurora: { label: 'Aurora', swatch: 'oklch(63% 0.22 160)' },
  zen: { label: 'Zen', swatch: 'oklch(68% 0.01 100)' },
  volt: { label: 'Volt', swatch: 'oklch(80% 0.22 105)' },
};

const AGES = ['child', 'teen', 'adult'] as const;

/** The Chameleon — theme × age × sensory controls. Zero reload token swaps. */
export default function ThemePicker() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { theme, age, muted, warmLight, setTheme, setAge, setMuted, setWarmLight } = useThemeStore();

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

  return (
    <div ref={ref} className="chameleon">
      <button
        className="chameleon-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Change theme world"
        title="Chameleon — change the world"
      >
        <Palette size={15} aria-hidden="true" />
        <span
          className="chameleon-dot"
          style={{ background: WORLDS[theme].swatch }}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="chameleon-panel" role="dialog" aria-label="Theme worlds">
          <div className="chameleon-row" role="group" aria-label="Color world">
            {(Object.keys(WORLDS) as ThemeId[]).map((id) => (
              <button
                key={id}
                className={`world-dot ${theme === id ? 'is-active' : ''}`}
                style={{ background: WORLDS[id].swatch }}
                onClick={() => setTheme(id)}
                aria-pressed={theme === id}
                title={`${WORLDS[id].label}${theme === id ? ' (current)' : ''}`}
              >
                <span className="sr-only">{WORLDS[id].label}</span>
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
              <span>Muted chroma</span>
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
