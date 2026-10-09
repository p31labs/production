import { NavLink, useLocation } from 'react-router-dom'
import { MobileBottomNav as CanonMobileBottomNav } from '@p31ca/design-core/compositions'
import { NAV_ITEMS } from './SidebarNav'

/** MobileBottomNav — the canon flagship bottom nav, composed with the forge's
 *  fixed-bar styling. Flagships (/, /catalog, /compose, /identity) are shown;
 *  `renderItem` keeps real react-router <a href> semantics. */
export function MobileBottomNav() {
  const { pathname } = useLocation()
  return (
    <CanonMobileBottomNav
      items={NAV_ITEMS}
      activePath={pathname}
      renderItem={(item) => (
        <NavLink
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) => `mobile-bottom-nav__link${isActive ? ' is-active' : ''}`}
          aria-label={item.label}
        >
          <span aria-hidden="true">{item.emoji}</span>
          <span className="mobile-bottom-nav__label">{item.label}</span>
        </NavLink>
      )}
    />
  )
}

export default MobileBottomNav