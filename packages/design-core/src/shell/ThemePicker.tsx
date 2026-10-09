import { useEffect, useRef, useState } from 'react';
import { THEME_LABELS, useThemeStore, type ThemeId } from '../theming/theme-store';

/**
 * @p31ca/design-core — shell/ThemePicker.tsx
 *
 * The slim 5-theme dropdown (the prototype's picker, canonized). Writes the
 * chosen theme to the persisted theme-store — the single source for CSS-var
 * application and theme-travel persistence. The console wires `onPick` into
 * its own userPickedTheme bookkeeping so the travel rule stays honest.
 */

export interface ThemePickerProps {
  /** Called with the picked theme (console updates userPickedTheme). */
  onPick?: (theme: ThemeId) => void;
  className?: string;
  label?: string;
}

export function ThemePicker({ onPick, className = '', label = 'Open theme picker' }: ThemePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      const panel = ref.current?.querySelector<HTMLDivElement>('.theme-picker__menu');
      if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector<HTMLButtonElement>('.theme-picker__trigger')?.focus(); }
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && open && panel) {
        e.preventDefault();
        const items = [...panel.querySelectorAll<HTMLButtonElement>('.theme-picker__item')];
        const idx = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === 'ArrowDown' ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
        items[next]?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const themes = Object.keys(THEME_LABELS) as ThemeId[];

  return (
    <div className={`theme-picker ${className}`.trim()} ref={ref}>
      <button
        type="button"
        className="theme-picker__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="theme-picker__swatch" data-theme={theme} aria-hidden="true" />
        <span className="theme-picker__label">{theme}</span>
        <span className="theme-picker__caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="theme-picker__menu" role="menu" aria-label="Theme">
          {themes.map((t) => (
            <button
              key={t}
              type="button"
              role="menuitem"
              className={`theme-picker__item${t === theme ? ' is-active' : ''}`}
              aria-current={t === theme ? 'true' : undefined}
              onClick={() => {
                setTheme(t);
                onPick?.(t);
                setOpen(false);
              }}
            >
              <span className="theme-picker__swatch" data-theme={t} aria-hidden="true" />
              <span className="theme-picker__name">{THEME_LABELS[t]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ThemePicker;