import { FLAGSHIP_PATHS, type SectionId, type Section } from '../lib/nav';
import { hapticTap } from '../lib/haptics';

interface MobileBottomNavProps {
  active: SectionId;
  onNavigate: (id: SectionId) => void;
  sections: Section[];
}

/**
 * MobileBottomNav — finance-first flagship tabs (home · revenue · positions ·
 * opportunities), icons + labels, ≥44px touch targets, safe-area aware.
 */
export function MobileBottomNav({ active, onNavigate, sections }: MobileBottomNavProps) {
  const items = sections.filter((s) => FLAGSHIP_PATHS.includes(s.id));

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {items.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => {
            hapticTap();
            onNavigate(s.id);
          }}
          aria-label={s.label}
          aria-current={active === s.id ? 'page' : undefined}
          className="mobile-bottom-nav__btn"
          data-spoons-safe="true"
          style={{ opacity: active === s.id ? 1 : 0.6 }}
        >
          <span aria-hidden="true">{s.emoji}</span>
          <span className="mobile-bottom-nav__label">{s.label.split('/')[0].split(' ')[0]}</span>
        </button>
      ))}
    </nav>
  );
}

export default MobileBottomNav;