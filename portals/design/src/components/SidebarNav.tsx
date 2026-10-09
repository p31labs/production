import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { SidebarNav as CanonSidebarNav } from '@p31ca/design-core/compositions';
import { NAV_SECTIONS } from '../lib/nav';

/** SidebarNav — the canon suite nav, composed in the design portal rail.
 *  `className="sidebar"` reuses the rail styling; `renderItem` keeps real
 *  react-router <a href> semantics (right/middle-click, SEO, a11y). */
export function SidebarNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <CanonSidebarNav
      className="sidebar"
      items={NAV_SECTIONS}
      activePath={pathname}
      onNavigate={navigate}
      renderItem={(item) => (
        <NavLink
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span aria-hidden="true">{item.emoji}</span>
          <span>{item.label}</span>
        </NavLink>
      )}
    />
  );
}

export default SidebarNav;