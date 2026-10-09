import React, { useState, useEffect, useRef } from 'react';
import { NAV_ATOMS, ACT_NAMES } from '../../lib/nav';
import type { ActId } from '../../lib/nav';
import { useThemeStore, type ThemeId } from '@p31ca/shell-chrome/stores';
import { loadIdentity } from '@p31ca/shared-identity';
import { useMenuStore } from '../../stores/menuStore';
import JourneyNav from './JourneyNav';
import ThemePicker from '../ThemePicker';

/**
 * CanonTopbar — the p31ca command bar.
 *
 * Row 1 (the only row): brand · three act triggers (Invitation / Immersion /
 * Action) · identity chip · overflow. Nothing else. Each act trigger opens a
 * dropdown panel listing that act's atoms — children on demand.
 *
 * Accessibility: native <button> with aria-expanded + aria-controls (the
 * Disclosure pattern, not role="menu"). Open on hover (100ms delay) AND click.
 * Escape closes. Single-open coordination via menuStore.
 */

const THEME_SWATCH: Record<ThemeId, string> = {
  cipher: '#22d3ee', garden: '#22c55e', retro: '#f472b6', ocean: '#06b6d4',
  sunset: '#fb923c', mono: '#9ca3af', aurora: '#a78bfa', zen: '#94a3b8', volt: '#f59e0b',
};
const WORLD_NAMES: Record<ThemeId, string> = {
  cipher: 'Cipher', garden: 'Garden', retro: 'Retro', ocean: 'Ocean',
  sunset: 'Sunset', mono: 'Mono', aurora: 'Aurora', zen: 'Zen', volt: 'Volt',
};

interface CanonTopbarProps {
  currentPath?: string;
  pageTitle?: string;
}

const ACT_ORDER: ActId[] = ['to', 'in', 'through'];
const ACT_MENU_ID: Record<ActId, 'invitation' | 'immersion' | 'action'> = {
  to: 'invitation',
  in: 'immersion',
  through: 'action',
};
const ACT_SHORT: Record<ActId, string> = {
  to: 'Invitation',
  in: 'Immersion',
  through: 'Action',
};

const CSS = `
  :root {
    --p31-radius-candy: 999px;
    --p31-accent-soft: color-mix(in oklch, var(--p31-accent, #22d3ee) 12%, transparent);
  }

  .posner-topbar {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: clamp(10px, 2vw, 24px);
    height: 60px;
    padding: 0 clamp(14px, 3vw, 28px);
    border-bottom: 1px solid var(--p31-glass-border, rgba(255,255,255,0.08));
    background: color-mix(in oklch, var(--p31-bg, #030712) 86%, transparent);
    backdrop-filter: blur(20px) saturate(150%);
    -webkit-backdrop-filter: blur(20px) saturate(150%);
  }

  .posner-brand {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 6px 10px; border: 0; border-radius: var(--p31-radius-candy);
    background: none; cursor: pointer; color: var(--p31-text, #e2e8f0);
    flex-shrink: 0;
  }
  .posner-brand:hover { background: var(--p31-accent-soft); }
  .posner-brand__mark {
    display: inline-flex; align-items: center; justify-content: center;
    width: 30px; height: 30px; border-radius: 9px;
    background: var(--p31-accent, #22d3ee); color: #05050a;
    font-weight: 800; font-size: 13px;
  }
  .posner-brand__name {
    font-weight: 700; font-size: clamp(0.88rem, 1.2vw + 0.4rem, 1rem);
    letter-spacing: 0.02em; white-space: nowrap;
  }
  @media (max-width: 640px) { .posner-brand__name { display: none; } }
  .posner-theme-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

  .posner-acts {
    display: flex; align-items: center; gap: 4px;
    flex: 1; justify-content: center; min-width: 0;
  }
  .posner-act { position: relative; flex-shrink: 0; }
  .posner-act__trigger {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px; border: 0; border-radius: var(--p31-radius-candy);
    background: transparent; color: var(--p31-text-secondary, #a1a1aa);
    font-size: 13px; font-weight: 500; font-family: inherit;
    cursor: pointer; white-space: nowrap;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .posner-act__trigger:hover,
  .posner-act__trigger[aria-expanded='true'] {
    background: var(--p31-surface2, #1a1a22);
    color: var(--p31-text, #e2e8f0);
  }
  .posner-act__trigger--active { color: var(--p31-accent, #22d3ee); font-weight: 700; }
  .posner-act__caret { font-size: 9px; opacity: 0.6; transition: transform 0.15s ease; }
  .posner-act__trigger[aria-expanded='true'] .posner-act__caret { transform: rotate(180deg); }
  @media (max-width: 720px) { .posner-act__trigger { padding: 8px 10px; font-size: 12px; } }

  .posner-act__panel {
    position: absolute; top: calc(100% + 10px); left: 50%;
    transform: translateX(-50%);
    min-width: 220px; padding: 8px;
    background: rgba(12, 12, 18, 0.98);
    border: 1px solid var(--p31-glass-border, rgba(255,255,255,0.10));
    border-radius: 16px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
    z-index: 2100;
  }
  /* Invisible bridge across the 10px gap between trigger and panel — the
     pointer stays "inside" the hover region while crossing, so the menu
     no longer closes mid-movement. */
  .posner-act__panel::before {
    content: ''; position: absolute;
    top: -10px; left: 0; right: 0; height: 10px;
  }
  .posner-act__panel-label {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
    color: var(--p31-text-tertiary, #71717a);
    padding: 6px 10px 4px;
  }
  .posner-act__panel-item {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; padding: 9px 12px; border-radius: 10px;
    color: var(--p31-text, #e2e8f0); font-size: 13px; text-decoration: none;
    transition: background 0.12s ease;
  }
  .posner-act__panel-item:hover { background: var(--p31-surface2, #1a1a22); }
  .posner-act__panel-item[aria-current='page'] {
    background: var(--p31-accent-soft);
    color: var(--p31-accent, #22d3ee);
  }
  .posner-act__panel-item-idx {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 10px; opacity: 0.4;
  }

  .posner-utils { display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .posner-chip {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    min-height: 34px; padding: 6px 12px;
    border-radius: var(--p31-radius-candy);
    border: 1px solid var(--p31-glass-border, rgba(255,255,255,0.10));
    background: var(--p31-surface, #14141c);
    color: var(--p31-text-secondary, #a1a1aa);
    font-size: 12px; cursor: pointer; text-decoration: none;
    transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
  }
  .posner-chip:hover { border-color: rgba(255,255,255,0.2); color: var(--p31-text, #e2e8f0); }
  .posner-chip--icon { padding: 6px 10px; }
  .posner-chip--accent {
    background: var(--p31-accent, #22d3ee); color: #05050a;
    font-weight: 700; border-color: transparent;
  }
  .posner-identity {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11px; color: var(--p31-accent, #22d3ee);
  }
  @media (max-width: 560px) {
    .posner-identity span:not([aria-hidden]) { display: none; }
  }

  .posner-overflow { position: relative; }
  .posner-overflow__menu {
    position: absolute; top: calc(100% + 10px); right: 0;
    min-width: 220px; padding: 8px;
    background: rgba(12, 12, 18, 0.98);
    border: 1px solid var(--p31-glass-border, rgba(255,255,255,0.10));
    border-radius: 16px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
    z-index: 2100;
  }
  .posner-overflow__item {
    display: flex; align-items: center; gap: 10px;
    width: 100%; padding: 9px 12px; border: 0; border-radius: 10px;
    background: none; color: var(--p31-text, #e2e8f0);
    font-size: 13px; font-family: inherit; text-decoration: none;
    cursor: pointer; text-align: left;
  }
  .posner-overflow__item:hover { background: var(--p31-surface2, #1a1a22); }
  .posner-overflow__sep {
    height: 1px; background: var(--p31-glass-border, rgba(255,255,255,0.08));
    margin: 6px 4px;
  }
  .posner-overflow__label {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--p31-text-tertiary, #71717a); padding: 6px 12px 2px;
  }
  .posner-spoons { display: flex; align-items: center; gap: 4px; padding: 8px 12px; }
  .posner-spoon {
    width: 20px; height: 20px; border: 0; border-radius: 50%;
    background: var(--p31-surface2, #1a1a22);
    color: var(--p31-text-tertiary, #71717a);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    font-size: 11px;
  }
  .posner-spoon--active { background: var(--p31-accent, #22d3ee); color: #000; }

  [data-spoons='0'] .posner-topbar,
  [data-spoons='0'] .posner-topbar *,
  [data-spoons='1'] .posner-topbar,
  [data-spoons='1'] .posner-topbar * { display: none !important; }
  @media (prefers-reduced-motion: reduce) {
    .posner-topbar * {
      transition-duration: 0ms !important;
      animation-duration: 0ms !important;
    }
    .posner-topbar { backdrop-filter: none; }
  }
`;

export const CanonTopbar: React.FC<CanonTopbarProps> = ({
  currentPath: propPath = '/',
  pageTitle,
}) => {
  const [theme, setTheme] = useState<ThemeId>('ocean');
  const [spoons, setSpoonsState] = useState(3);
  const [resolvedPath, setResolvedPath] = useState(propPath);
  const [deviceDid, setDeviceDid] = useState<string | null>(null);

  const openMenuId = useMenuStore((s) => s.openMenuId);
  const toggleMenu = useMenuStore((s) => s.toggleMenu);
  const closeMenu = useMenuStore((s) => s.closeMenu);
  const hoverTimer = useRef<number | null>(null);
  const topbarRef = useRef<HTMLElement>(null);
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    try {
      const identity = loadIdentity();
      if (identity?.did) setDeviceDid(identity.did);
    } catch {
      /* no identity on this device */
    }
  }, []);

  useEffect(() => {
    const stored = parseInt(localStorage.getItem('p31:spoons') || '3', 10);
    const level = Number.isFinite(stored) ? stored : 3;
    setSpoonsState(level);
    document.documentElement.setAttribute('data-spoons', String(level));

    useThemeStore.getState().syncFromDom();
    useThemeStore.getState().applyTheme();
    setTheme(useThemeStore.getState().theme);

    const themeUnsubscribe = useThemeStore.subscribe((s) => {
      if (s.theme !== theme) setTheme(s.theme);
    });

    if (typeof window !== 'undefined') setResolvedPath(window.location.pathname);
    return () => themeUnsubscribe;
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (topbarRef.current && !topbarRef.current.contains(e.target as Node)) closeMenu();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [closeMenu]);

  const currentPath = typeof window !== 'undefined' ? resolvedPath : propPath;

  const setSpoons = (level: number) => {
    setSpoonsState(level);
    localStorage.setItem('p31:spoons', String(level));
    document.documentElement.setAttribute('data-spoons', String(level));
  };

  const handleThemeCycle = () => {
    const nextTheme = useThemeStore.getState().cycleTheme();
    window.dispatchEvent(new CustomEvent('p31:toast', {
      detail: { message: `🌎 World shifted to ${WORLD_NAMES[nextTheme]}`, duration: 2000 },
    }));
  };

  const handleHoverOpen = (id: 'invitation' | 'immersion' | 'action') => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      if (openMenuId !== 'journey' && openMenuId !== 'overflow') toggleMenu(id);
    }, 100);
  };

  const handleHoverLeave = (e?: React.MouseEvent) => {
    // If the pointer is moving into an open panel (or its children), keep it
    // open — don't schedule a close for the 10px gap crossing.
    if (e?.relatedTarget) {
      const next = e.relatedTarget as Node | null
      for (const id of Object.keys(panelRefs.current)) {
        if (next && panelRefs.current[id]?.contains(next)) return
      }
    }
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => closeMenu(), 350);
  };

  const handlePanelEnter = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
  };

  const handlePanelLeave = (e?: React.MouseEvent) => {
    handleHoverLeave(e)
  };

  const actHasActiveAtom = (act: ActId) =>
    NAV_ATOMS.some((a) => {
      if (a.act !== act) return false;
      return currentPath === a.href || (a.href !== '/' && currentPath.startsWith(a.href));
    });

  const renderPanel = (act: ActId) => {
    const atoms = NAV_ATOMS.filter((a) => a.act === act);
    const menuId = ACT_MENU_ID[act];
    if (openMenuId !== menuId) return null;
    return (
      <div
        ref={(el) => { panelRefs.current[menuId] = el }}
        className="posner-act__panel"
        id={`act-panel-${menuId}`}
        role="group"
        aria-label={`${ACT_NAMES[act].name} — ${ACT_NAMES[act].label}`}
        onMouseEnter={handlePanelEnter}
        onMouseLeave={handlePanelLeave}
      >
        <div className="posner-act__panel-label">
          {ACT_NAMES[act].name} · {ACT_NAMES[act].label}
        </div>
        {atoms.map((atom) => {
          const isActive = currentPath === atom.href || (atom.href !== '/' && currentPath.startsWith(atom.href));
          return (
            <a
              key={atom.id}
              href={atom.href}
              className="posner-act__panel-item"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => closeMenu()}
            >
              <span>{atom.label}</span>
              <span className="posner-act__panel-item-idx">{atom.index}</span>
            </a>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <style>{CSS}</style>
      <header ref={topbarRef} className="posner-topbar" role="banner">
        <button
          type="button"
          onClick={handleThemeCycle}
          className="posner-brand"
          title="Click to cycle theme"
          aria-label="P31 Labs — Home. Click to cycle theme."
        >
          <span className="posner-brand__mark">31</span>
          <span className="posner-brand__name">P31 LABS</span>
          <span className="posner-theme-dot" style={{ background: THEME_SWATCH[theme] }} aria-hidden="true" />
        </button>

        <nav className="posner-acts" aria-label="Primary navigation">
          {ACT_ORDER.map((act) => {
            const menuId = ACT_MENU_ID[act];
            const isOpen = openMenuId === menuId;
            return (
              <div
                key={act}
                className="posner-act"
                onMouseEnter={() => handleHoverOpen(menuId)}
                onMouseLeave={(e) => handleHoverLeave(e)}
              >
                <button
                  type="button"
                  className={`posner-act__trigger${actHasActiveAtom(act) ? ' posner-act__trigger--active' : ''}`}
                  aria-expanded={isOpen}
                  aria-controls={`act-panel-${menuId}`}
                  aria-haspopup="true"
                  onClick={() => toggleMenu(menuId)}
                  onFocus={() => {
                    if (openMenuId !== menuId) toggleMenu(menuId);
                  }}
                >
                  {ACT_SHORT[act]}
                  <span className="posner-act__caret" aria-hidden="true">▾</span>
                </button>
                {renderPanel(act)}
              </div>
            );
          })}
        </nav>

        <div className="posner-utils">
          {deviceDid ? (
            <a href="/love" className="posner-chip posner-identity" title={`Connected as ${deviceDid}`}>
              <span aria-hidden="true">🔑</span> <span>{deviceDid.slice(0, 6)}…{deviceDid.slice(-4)}</span>
            </a>
          ) : (
            <a href="/signin" className="posner-chip posner-chip--accent">Sign In</a>
          )}

          <JourneyNav current="hub" />

          <div className="posner-overflow">
            <button
              type="button"
              className="posner-chip posner-chip--icon"
              aria-haspopup="true"
              aria-expanded={openMenuId === 'overflow'}
              aria-controls="overflow-menu"
              aria-label="More"
              title="More"
              onClick={() => toggleMenu('overflow')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" />
              </svg>
            </button>
            {openMenuId === 'overflow' && (
              <div className="posner-overflow__menu" id="overflow-menu" role="group" aria-label="More">
                <ThemePicker />
                <div className="posner-overflow__sep" />
                <div className="posner-overflow__label">Spoons</div>
                <div className="posner-spoons" role="radiogroup" aria-label="Spoon level">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      role="radio"
                      aria-checked={spoons === level}
                      className={`posner-spoon${spoons === level ? ' posner-spoon--active' : ''}`}
                      onClick={() => setSpoons(level)}
                      aria-label={`Spoon ${level}`}
                    >
                      {level}
                    </button>
                  ))}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={spoons === 0}
                    className={`posner-spoon${spoons === 0 ? ' posner-spoon--active' : ''}`}
                    onClick={() => setSpoons(0)}
                    aria-label="Sensory rest mode"
                  >
                    🧘
                  </button>
                </div>
                <div className="posner-overflow__sep" />
                <a className="posner-overflow__item" href="/system" onClick={closeMenu}>
                  <span aria-hidden="true">🖥️</span> System
                </a>
                <a className="posner-overflow__item" href="/treasury" onClick={closeMenu}>
                  <span aria-hidden="true">💠</span> Treasury
                </a>
                <a className="posner-overflow__item" href="/arcade" onClick={closeMenu}>
                  <span aria-hidden="true">🎮</span> Arcade
                </a>
                <div className="posner-overflow__sep" />
                <a className="posner-overflow__item" href="https://github.com/p31labs" target="_blank" rel="noopener noreferrer" onClick={closeMenu}>
                  <span aria-hidden="true">🐙</span> GitHub
                </a>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default CanonTopbar;