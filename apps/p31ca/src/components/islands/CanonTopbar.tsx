import React, { useState, useEffect, useRef } from 'react';
import { NAV_ATOMS, ACT_NAMES } from '../../lib/nav';
import type { ActId } from '../../lib/nav';
import { useThemeStore, type ThemeId } from '@p31ca/shell-chrome/stores';
import { loadIdentity } from '@p31ca/shared-identity';
import { useMenuStore } from '../../stores/menuStore';
import { yieldToMain } from '../../lib/yieldToMain';
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


export const CanonTopbar: React.FC<CanonTopbarProps> = () => {
  const [theme, setTheme] = useState<ThemeId>('ocean');
  const [spoons, setSpoonsState] = useState(3);
  // null-init: SSR and the first client render both render NO active states,
  // so hydration never mismatches (React #425 on ClientRouter swaps). The
  // mount effect fills the real path afterward.
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);
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
    // Phase 3 Batch 1 (D1): applyTheme() writes the store's hardcoded
    // 'ocean' default over the page's SSR data-theme on every fresh load
    // (no stored preference) — which clobbers the ratified
    // [data-theme="rose"] the hub now ships. Re-apply only a STORED
    // preference; a fresh load keeps the SSR theme. The switcher's own
    // store/cycle semantics are unchanged.
    if (localStorage.getItem('p31:theme')) {
      useThemeStore.getState().applyTheme();
    }
    const applyDot = (t: ThemeId) => {
      document.documentElement.style.setProperty('--p31-theme-dot', THEME_SWATCH[t] || THEME_SWATCH.ocean);
    };
    applyDot(useThemeStore.getState().theme);
    setTheme(useThemeStore.getState().theme);

    const themeUnsubscribe = useThemeStore.subscribe((s) => {
      if (s.theme !== theme) {
        setTheme(s.theme);
        applyDot(s.theme);
      }
    });

    if (typeof window !== 'undefined') setResolvedPath(window.location.pathname);
    return () => themeUnsubscribe;
  }, []);

  useEffect(() => {
    // AbortController + astro:after-swap pattern: ClientRouter swaps discard
    // non-persisted islands WITHOUT unmounting React, so a removed topbar's
    // listeners would otherwise leak (and its stale mousedown handler could
    // close the next island's freshly-opened panel). When this instance's
    // header is no longer connected, abort its controller — the signal
    // tears down the document listeners in one move.
    const ac = new AbortController();
    const onDoc = (e: MouseEvent) => {
      if (topbarRef.current && !topbarRef.current.contains(e.target as Node)) closeMenu();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('mousedown', onDoc, { signal: ac.signal });
    document.addEventListener('keydown', onKey, { signal: ac.signal });
    const onSwap = () => {
      if (topbarRef.current && !topbarRef.current.isConnected) ac.abort();
    };
    document.addEventListener('astro:after-swap', onSwap);
    return () => {
      ac.abort();
      document.removeEventListener('astro:after-swap', onSwap);
    };
  }, [closeMenu]);

  const currentPath = resolvedPath;

  const setSpoons = (level: number) => {
    // INP: the spoon change re-renders the whole shell (every surface reads
    // data-spoons). Yield one frame first so the click itself paints.
    void yieldToMain().then(() => {
      setSpoonsState(level);
      localStorage.setItem('p31:spoons', String(level));
      document.documentElement.setAttribute('data-spoons', String(level));
    });
  };

  const handleThemeCycle = () => {
    // INP: a theme cycle swaps every surface's tokens (the largest paint
    // burst on the page). Yield first, then cycle — and apply the theme to
    // the DOM immediately. cycleTheme() only updates the store +
    // localStorage; applyTheme() is what writes data-theme, and without it
    // the toggle looks dead until the next navigation re-mounts the island
    // (owner-reported theme-switcher bug).
    void yieldToMain().then(() => {
      const nextTheme = useThemeStore.getState().cycleTheme();
      useThemeStore.getState().applyTheme();
      document.documentElement.style.setProperty('--p31-theme-dot', THEME_SWATCH[nextTheme] || THEME_SWATCH.ocean);
      window.dispatchEvent(new CustomEvent('p31:toast', {
        detail: { message: `🌎 World shifted to ${WORLD_NAMES[nextTheme]}`, duration: 2000 },
      }));
    });
  };

  const openMenu = (id: 'invitation' | 'immersion' | 'action' | 'journey' | 'overflow') => {
    // INP: the panel render (atom lists, ThemePicker) is the long chunk —
    // yield a frame so the trigger's pressed state paints before it.
    void yieldToMain().then(() => toggleMenu(id));
  };

  const handleHoverOpen = (id: 'invitation' | 'immersion' | 'action') => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      if (openMenuId !== 'journey' && openMenuId !== 'overflow') openMenu(id);
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
      if (a.act !== act || !currentPath) return false;
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
          const isActive = !!currentPath && (currentPath === atom.href || (atom.href !== '/' && currentPath.startsWith(atom.href)));
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
          {/* The dot color reads from --p31-theme-dot (set by the shell's
              prefs script + this island), never from a client-only state —
              SSR and client render identical markup, so ClientRouter swaps
              never trigger React hydration mismatches (#425). */}
          <span className="posner-theme-dot" style={{ background: 'var(--p31-theme-dot, #06b6d4)' }} aria-hidden="true" />
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
                  onClick={() => openMenu(menuId)}
                  onFocus={() => {
                    if (openMenuId !== menuId) openMenu(menuId);
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
          {/* Global nav contract: GitHub is a first-class destination, not
              buried in the overflow menu (docs/SITE_MAP_AND_OWNERSHIP.md). */}
          <a
            href="https://github.com/p31labs"
            target="_blank"
            rel="noopener noreferrer"
            className="posner-chip posner-chip--github"
            title="GitHub — the monorepo"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11.1 11.1 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .31.21.67.8.56A11.52 11.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
            </svg>
            <span className="posner-github-label">GitHub</span>
          </a>

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
              onClick={() => openMenu('overflow')}
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
                <a className="posner-overflow__item" href="https://phosphorus31.org" target="_blank" rel="noopener noreferrer" onClick={closeMenu}>
                  <span aria-hidden="true">🫀</span> Nonprofit portal
                </a>
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