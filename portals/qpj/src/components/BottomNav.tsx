import { useQpjStore } from '../store/useQpjStore';

const NAV_ITEMS = [
  { route: 'street', glyph: '🏘️', label: 'Street' },
  { route: 'talk', glyph: '💬', label: 'Talk' },
  { route: 'craft', glyph: '🧩', label: 'Craft' },
  { route: 'you', glyph: '🪞', label: 'You' },
] as const;

export interface BottomNavProps {
  active: string;
  onNavigate: (route: 'street' | 'talk' | 'craft' | 'you') => void;
  mode: string;
}

export function BottomNav({ active, onNavigate, mode }: BottomNavProps) {
  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.route;
        const locked = item.route === 'craft' && mode === 'spark';
        return (
          <button
            key={item.route}
            type="button"
            className={`bottom-nav__button${isActive ? ' bottom-nav__button--active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onNavigate(item.route)}
          >
            <span className="bottom-nav__glyph" aria-hidden="true">
              {item.glyph}
              {locked && <span className="bottom-nav__lock" aria-hidden="true" />}
            </span>
            <span className="bottom-nav__label">
              {item.label}
              {locked && <span className="sr-only"> (locked — ask a caregiver)</span>}
            </span>
          </button>
        );
      })}
      <div className="bottom-nav__mode" aria-label={`Mode: ${modeLabel}`}>
        <span className="bottom-nav__mode-dot" aria-hidden="true" />
        <span className="bottom-nav__mode-label">{modeLabel}</span>
      </div>
    </nav>
  );
}

export function useBottomNavState() {
  const mode = useQpjStore((s) => s.mode);
  return { mode };
}