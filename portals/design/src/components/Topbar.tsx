import { useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useSpoonsStore } from '../lib/useSpoonsStore';
import { useNotifStore } from '../lib/useNotifStore';
import { useThemeStore, THEME_TOKENS, THEME_LABELS, type ThemeId } from '@p31ca/design-core/theming/theme-store';

interface TopbarProps {
  mode: 'spark' | 'maker' | 'workshop';
  onElevate: () => void;
  onOpenPalette: () => void;
  onOpenSession: () => void;
  sessionTriggerRef?: RefObject<HTMLButtonElement | null>;
}

/** Canonical themes from design-core (THEME_LABELS) — the single source
 *  both this picker and the /brands switcher consume. No portal-side list. */
const THEMES: { id: ThemeId; label: string }[] = (Object.keys(THEME_LABELS) as ThemeId[]).map((id) => ({
  id,
  label: THEME_LABELS[id],
}));

/** ThemePicker — Chameleon switcher. The menu renders via a portal to
 *  document.body so it escapes the sticky + blurred topbar stacking context
 *  (previously it was clipped inside the topbar and invisible). */
function ThemePicker() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const applyTheme = useThemeStore((s) => s.applyTheme);
  const notify = useNotifStore((s) => s.notify);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const accent = THEME_TOKENS[theme]?.['--p31-accent'] ?? 'oklch(73% 0.18 195)';

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchor(e.currentTarget.getBoundingClientRect());
    setOpen((o) => !o);
  };

  const pick = (id: ThemeId) => {
    setTheme(id);
    applyTheme();
    notify({ kind: 'success', title: `Theme: ${id}`, body: 'Every surface recolorized via the Chameleon token set.' });
    setOpen(false);
  };

  return (
    <div className="theme-picker">
      <button
        type="button"
        className="theme-picker__trigger"
        onClick={toggle}
        aria-expanded={open}
        aria-label={`Theme: ${theme}. Open theme picker`}
      >
        <span className="theme-picker__swatch" style={{ background: accent }} aria-hidden="true" />
        <span className="theme-picker__label">{theme}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open &&
        anchor &&
        createPortal(
          <>
            <div className="theme-picker__scrim" onClick={() => setOpen(false)} aria-hidden="true" />
            <div
              className="theme-picker__menu"
              role="menu"
              aria-label="Choose theme"
              style={{ top: anchor.bottom + 8, left: anchor.left }}
            >
              {THEMES.map((t) => {
                const a = THEME_TOKENS[t.id]?.['--p31-accent'] ?? 'oklch(73% 0.18 195)';
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="menuitem"
                    className={`theme-picker__item ${t.id === theme ? 'active' : ''}`}
                    onClick={() => pick(t.id)}
                  >
                    <span className="theme-picker__swatch" style={{ background: a }} aria-hidden="true" />
                    <span>{t.label}</span>
                    {t.id === theme && <span className="theme-picker__check" aria-hidden="true">✓</span>}
                  </button>
                );
              })}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}

/** Topbar — suite chrome (crown brand, center search, theme + badge + spoon dial + avatar). */
export function Topbar({ mode, onElevate, onOpenPalette, onOpenSession, sessionTriggerRef }: TopbarProps) {
  const spoons = useSpoonsStore((s) => s.spoons);
  const setSpoons = useSpoonsStore((s) => s.setSpoons);
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="topbar-brand" onClick={() => navigate('/')}>
          <div className="p31-crown-logo">31</div>
          <span>P31 Design System</span>
        </button>
        <ThemePicker />
      </div>

      <div className="topbar-center">
        <button type="button" className="search-box" onClick={onOpenPalette} aria-label="Open Command Palette">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Search surfaces or jump to a section…</span>
          <kbd className="search-kbd">⌘K</kbd>
        </button>
      </div>

      <div className="topbar-right">
        <button type="button" className="session-btn" ref={sessionTriggerRef} onClick={onOpenSession} aria-label="Open session summary">
          <span className="session-btn__icon" aria-hidden="true">◈</span>
          <span className="session-btn__label">End session</span>
        </button>
        <button type="button" className={`badge badge-${mode}`} onClick={onElevate} title="Elevate mode (demo)">
          {mode.toUpperCase()}
        </button>

        <div className="spoon-dial" aria-label="Spoon Dial Energy Selector">
          <span className="spoon-dial-label">SPOONS</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`spoon-dot ${n <= spoons ? 'active' : ''}`}
              onClick={() => setSpoons(n)}
              aria-label={`Set spoon level ${n}`}
            />
          ))}
          <button type="button" className="spoon-crisis-btn" onClick={() => setSpoons(0)}>Calm</button>
        </div>

        <div className="avatar" aria-label="User Profile">A</div>
      </div>
    </header>
  );
}

export default Topbar;