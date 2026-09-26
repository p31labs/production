import { useLocation, useNavigate } from 'react-router-dom';
import { NAV_SECTIONS, isActivePath } from '../lib/nav';

/** MobileBottomNav — flagship items (suite pattern). */
export function MobileBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const items = NAV_SECTIONS.filter((s) => s.flagship);

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {items.map((s) => (
        <button
          key={s.path}
          type="button"
          onClick={() => navigate(s.path)}
          aria-label={s.label}
          className="mobile-bottom-nav__btn"
          style={{ opacity: isActivePath(s.path, pathname) ? 1 : 0.6 }}
        >
          <span aria-hidden="true">{s.emoji}</span>
        </button>
      ))}
    </nav>
  );
}

export default MobileBottomNav;