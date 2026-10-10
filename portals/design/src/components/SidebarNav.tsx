import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { SidebarNav as CanonSidebarNav } from '@p31ca/design-core/compositions';
import { NAV_SECTIONS, SECTION_GROUPS, isActivePath } from '../lib/nav';

/** SidebarNav — the system-of-record nav, grouped into the five sections.
 *  Renders Home first, then Foundations → Components → Patterns → Resources →
 *  Agents, each with a section heading. Uses the canon SidebarNav for the
 *  item list so active-state + styling stay canon-owned. */
export function SidebarNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const renderItem = (item: { path: string; label: string; emoji?: string }) => (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
    >
      <span aria-hidden="true">{item.emoji}</span>
      <span>{item.label}</span>
    </NavLink>
  );

  const home = NAV_SECTIONS.filter((s) => s.path === '/');
  const bySection = (id: string) => NAV_SECTIONS.filter((s) => s.section === id && s.path !== '/');

  return (
    <nav className="sidebar-nav sidebar" aria-label="Main navigation">
      {home.map((s) => {
        const active = isActivePath(s.path, pathname);
        return (
          <span key={s.path} className={`sidebar-nav__item${active ? ' is-active' : ''}`} data-active={active || undefined}>
            {renderItem(s)}
          </span>
        );
      })}
      {SECTION_GROUPS.map((group) => {
        const items = bySection(group.id);
        if (items.length === 0) return null;
        return (
          <div key={group.id} className="sidebar-section">
            <div className="sidebar-section__heading">
              <span aria-hidden="true">{group.emoji}</span>
              <span>{group.label}</span>
            </div>
            <CanonSidebarNav
              className="sidebar-section__list"
              items={items}
              activePath={pathname}
              onNavigate={navigate}
              renderItem={renderItem}
            />
          </div>
        );
      })}
    </nav>
  );
}

export default SidebarNav;