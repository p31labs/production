import { useLocation, useNavigate } from 'react-router-dom';
import { NAV_SECTIONS, isActivePath } from '../lib/nav';

/** SidebarNav — flat suite nav (emoji + label), active state per route. */
export function SidebarNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="sidebar" aria-label="Main navigation">
      {NAV_SECTIONS.map((s) => (
        <button
          key={s.path}
          type="button"
          className={`nav-item ${isActivePath(s.path, pathname) ? 'active' : ''}`}
          onClick={() => navigate(s.path)}
        >
          <span aria-hidden="true">{s.emoji}</span>
          <span>{s.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default SidebarNav;