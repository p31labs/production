/**
 * ThemePicker — Quantum Material theme switcher.
 * Swatches in a pill. Calm floor: at spoons <= 1, collapse to a single
 * toggle (less to parse — the canon's spoon-aware rule applied to the chrome).
 */
import { useEffect, useState } from 'react';
import { applyTheme, getCurrentTheme, THEMES, type ThemeId } from '../lib/theme';
import { useUI } from '../lib/store';

export function ThemePicker() {
  const [theme, setTheme] = useState<ThemeId>(() => getCurrentTheme());
  const spoons = useUI((s) => s.spoons);

  useEffect(() => { applyTheme(theme); }, [theme]);

  if (spoons <= 1) {
    const next: ThemeId = theme === 'ocean' ? 'volt' : 'ocean';
    return (
      <button className="theme-toggle" aria-label={`Switch to ${next} theme`} onClick={() => setTheme(next)}>
        ◐
      </button>
    );
  }

  return (
    <div className="theme-picker" role="group" aria-label="Report theme">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          className="theme-swatch"
          aria-pressed={theme === t.id}
          aria-label={t.label}
          title={t.label}
          style={{ background: t.swatch }}
          onClick={() => setTheme(t.id)}
        />
      ))}
    </div>
  );
}