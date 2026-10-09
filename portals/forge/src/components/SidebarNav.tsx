import { NavLink, useLocation } from 'react-router-dom'
import {
  SidebarNav as CanonSidebarNav,
  type SidebarNavItem,
} from '@p31ca/design-core/compositions'

export const NAV_ITEMS: SidebarNavItem[] = [
  { path: '/', label: 'Home', emoji: '🏠', flagship: true },
  { path: '/playground', label: 'Playground', emoji: '🛝' },
  { path: '/catalog', label: 'Catalog', emoji: '🧩', flagship: true },
  { path: '/identity', label: 'Identity', emoji: '🔐', flagship: true },
  { path: '/compose', label: 'Compose', emoji: '⚛️', flagship: true },
  { path: '/activity', label: 'Activity', emoji: '📈' },
  { path: '/channels', label: 'Channels', emoji: '📤' },
]

/** SidebarNav — the canon suite nav, composed inside the forge drawer. The canon
 *  owns layout + active state; `renderItem` keeps real react-router <a href>
 *  semantics (right-click / middle-click / SEO / a11y) instead of buttons. */
export function SidebarNav() {
  const { pathname } = useLocation()
  const open = false // desktop rail is a closed drawer in this build; mobile uses the bottom nav
  return (
    <aside className={`sidebar ${open ? 'is-open' : ''}`}>
      <CanonSidebarNav
        items={NAV_ITEMS}
        activePath={pathname}
        renderItem={(item) => (
          <NavLink
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `sidebar-nav__link${isActive ? ' is-active' : ''}`}
          >
            {item.emoji && <span aria-hidden="true">{item.emoji}</span>}
            <span>{item.label}</span>
          </NavLink>
        )}
      />
    </aside>
  )
}

export default SidebarNav