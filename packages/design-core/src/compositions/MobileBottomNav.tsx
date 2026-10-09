import type { ReactNode } from 'react';
import type { SidebarNavItem } from './SidebarNav';

export interface MobileBottomNavProps {
  /** Structured navigation items (spec); only flagships are shown. */
  items: SidebarNavItem[];
  /** Currently active path. */
  activePath?: string;
  /** Navigate handler — the consumer owns routing. */
  onNavigate?: (path: string) => void;
  /** Render a flagship item as an arbitrary node (link, NavLink, <a>) instead
   *  of the default <button> — the consumer keeps real <a href> semantics
   *  without hand-rolling the nav. `active` + `navigate` are supplied. */
  renderItem?: (item: SidebarNavItem, state: { active: boolean; navigate: (path: string) => void }) => ReactNode;
  className?: string;
  ariaLabel?: string;
}

/** MobileBottomNav — flagship items only (suite pattern).
 *  Store-agnostic; the consumer filters `items` to its flagships if desired.
 *  Default items render as <button>; pass `renderItem` for real link nodes. */
export function MobileBottomNav({
  items,
  activePath,
  onNavigate,
  renderItem,
  className = '',
  ariaLabel = 'Mobile navigation',
}: MobileBottomNavProps) {
  /** Show only flagship items (the suite pattern). An item is flagship only
   *  when `flagship === true` — unset means "not a bottom-nav shortcut". */
  const show = items.filter((s) => s.flagship === true);
  return (
    <nav className={`mobile-bottom-nav ${className}`.trim()} aria-label={ariaLabel}>
      {show.map((s) => {
        const active = activePath
          ? activePath === s.path || activePath.startsWith(s.path + '/')
          : false;
        const navigate = () => onNavigate?.(s.path);
        if (renderItem) {
          return (
            <span
              key={s.path}
              className={`mobile-bottom-nav__item${active ? ' is-active' : ''}`}
              data-active={active || undefined}
            >
              {renderItem(s, { active, navigate })}
            </span>
          );
        }
        return (
          <button
            key={s.path}
            type="button"
            className="mobile-bottom-nav__btn"
            aria-label={s.label}
            aria-current={active ? 'page' : undefined}
            onClick={navigate}
          >
            <span aria-hidden="true">{s.emoji}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default MobileBottomNav;