import { NavLink, useLocation } from 'react-router-dom';
import { MobileBottomNav as CanonMobileBottomNav } from '@p31ca/design-core/compositions';
import { NAV_SECTIONS } from '../lib/nav';

/** MobileBottomNav — canon flagship bottom nav. Flagships are already marked
 *  in NAV_SECTIONS (6); `renderItem` keeps real react-router <a href>
 *  semantics. Active state via the canon's aria-current rule. */
export function MobileBottomNav() {
  const { pathname } = useLocation();
  return (
    <CanonMobileBottomNav
      items={NAV_SECTIONS}
      activePath={pathname}
      renderItem={(item) => (
        <NavLink
          to={item.path}
          end={item.path === '/'}
          className="mobile-bottom-nav__btn"
          aria-label={item.label}
        >
          <span aria-hidden="true">{item.emoji}</span>
        </NavLink>
      )}
    />
  );
}

export default MobileBottomNav;