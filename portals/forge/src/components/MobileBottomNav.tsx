import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './SidebarNav'

export function MobileBottomNav() {
  return (
    <nav className="mobile-nav" aria-label="Mobile">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) => `mobile-nav__link ${isActive ? 'is-active' : ''}`}
        >
          <span className="emoji">{item.emoji}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}