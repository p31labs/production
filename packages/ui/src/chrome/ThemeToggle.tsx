/**
 * ThemeToggle — two-state color scheme toggle (Lea Verou's "two states are
 * enough" pattern).
 *
 * The underlying model has three states (system / scene / sunlight), but the
 * user-facing control only shows two: the current opposite of system, and
 * back to system. No tri-state deadlock, no "which of three am I" ambiguity.
 *
 * Scene = the immersive dark dome homepage (cipher). Sunlight = the warm
 * editorial hub. The toggle flips <html data-theme> and persists the override.
 * The spoon dial remains the motion control; this is purely color.
 */
import { useEffect, useState } from 'react';

const SCENE = 'cipher';
const HUB = 'sunlight';
const KEY = 'p31:theme-override';

function systemIsDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [override, setOverride] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(KEY);
    setOverride(stored);
    if (stored) {
      document.documentElement.setAttribute('data-theme', stored);
    } else {
      document.documentElement.setAttribute('data-theme', systemIsDark() ? SCENE : HUB);
    }
  }, []);

  // Effective theme = override, else system default.
  const effective = override ?? (systemIsDark() ? SCENE : HUB);
  const isScene = effective === SCENE;

  const toggle = () => {
    const next = isScene ? HUB : SCENE;
    localStorage.setItem(KEY, next);
    document.documentElement.setAttribute('data-theme', next);
    setOverride(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isScene ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={isScene}
      data-agent-kind="action"
      data-agent-action="theme.toggle"
      className={`theme-toggle ${className}`}
      title={isScene ? 'Switch to sunlight (light)' : 'Switch to scene (dark)'}
    >
      <span aria-hidden="true">{isScene ? '☀' : '◐'}</span>
      <span className="theme-toggle__label" aria-hidden="true">
        {isScene ? 'sunlight' : 'scene'}
      </span>
      <style>{`
        .theme-toggle {
          display: inline-flex; align-items: center; gap: 0.4rem;
          min-height: 36px; padding: 0 0.75rem;
          border-radius: 9999px;
          border: 1px solid var(--p31-glass-border, rgba(255,255,255,0.12));
          background: color-mix(in oklab, var(--p31-surface, #12121a) 80%, transparent);
          color: var(--p31-text-secondary, rgba(245,245,247,0.6));
          font-family: var(--p31-font-mono, monospace);
          font-size: 12px; cursor: pointer;
          transition: color 200ms var(--p31-spring-effects, cubic-bezier(0.34,0.8,0.34,1));
        }
        .theme-toggle:hover { color: var(--p31-text, #f5f5f7); }
        .theme-toggle__label { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; }
        @media (prefers-reduced-motion: reduce) { .theme-toggle { transition: none; } }
      `}</style>
    </button>
  );
}

export default ThemeToggle;