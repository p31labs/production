import { NavLink } from 'react-router-dom'

export const NAV_ITEMS: Array<{ path: string; label: string; emoji: string }> = [
  { path: '/', label: 'Home', emoji: '🏠' },
  { path: '/catalog', label: 'Catalog', emoji: '🧩' },
  { path: '/compose', label: 'Compose', emoji: '⚛️' },
  { path: '/activity', label: 'Activity', emoji: '📈' },
  { path: '/channels', label: 'Channels', emoji: '📤' },
]

export function SidebarNav() {
  const open = false // desktop rail is always open in this build; mobile uses the drawer via a separate mechanism
  return (
    <>
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <nav className="sidebar__nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`}
            >
              <span className="emoji">{item.emoji}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}