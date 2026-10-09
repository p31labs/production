
import type { ReactNode } from 'react';

export interface SidebarNavItem {
  path: string;
  label: string;
  emoji?: string;
  flagship?: boolean;
}

/** Render-state handed to `renderItem`: active routing state plus a navigate
 *  convenience (consumers using react-router NavLink typically ignore it and
 *  let the link own navigation). */
export interface SidebarNavRenderState {
  active: boolean;
  navigate: (path: string) => void;
}

export interface SidebarNavProps {
  /** Structured navigation items (spec). */
  items: SidebarNavItem[];
  /** Currently active path. */
  activePath?: string;
  /** Navigate handler — the consumer owns routing (react-router, etc.). */
  onNavigate?: (path: string) => void;
  /** Render an item as an arbitrary node (link, NavLink, <a>) instead of the
   *  default <button>. The canon supplies `active` + `navigate` state; layout,
   *  spacing, and active-state container are still canon-owned. This is how a
   *  consumer keeps real <a href> semantics (right/middle-click, SEO, a11y)
   *  without hand-rolling the nav. */
  renderItem?: (item: SidebarNavItem, state: SidebarNavRenderState) => ReactNode;
  className?: string;
  ariaLabel?: string;
}

/** Simple active-path match: exact, or prefix for section roots. */
export function isActivePath(path: string, current?: string): boolean {
  if (!current) return false;
  if (path === '/') return current === '/';
  return current === path || current.startsWith(path + '/');
}

/** SidebarNav — flat suite nav (emoji + label), active state per route.
 *  Store-agnostic: the consumer passes `items`, `activePath`, and `onNavigate`.
 *  Default items render as <button>; pass `renderItem` for real link nodes. */
export function SidebarNav({
  items,
  activePath,
  onNavigate,
  renderItem,
  className = '',
  ariaLabel = 'Main navigation',
}: SidebarNavProps) {
  return (
    <nav className={`sidebar-nav ${className}`.trim()} aria-label={ariaLabel}>
      {items.map((s) => {
        const active = isActivePath(s.path, activePath);
        const navigate = () => onNavigate?.(s.path);
        if (renderItem) {
          return (
            <span
              key={s.path}
              className={`sidebar-nav__item${active ? ' is-active' : ''}`}
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
            className={`sidebar-nav__item${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={navigate}
          >
            {s.emoji && <span aria-hidden="true">{s.emoji}</span>}
            <span>{s.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default SidebarNav;