import type { SectionId } from '../lib/nav';
import { usePrefetchOnHover } from '../hooks/usePrefetch';

interface SidebarNavProps {
  active: SectionId;
  onNavigate: (id: SectionId) => void;
  sections: { id: SectionId; label: string; emoji: string }[];
}

/** SidebarNav — flat suite nav (emoji + label), active state per section. */
export function SidebarNav({ active, onNavigate, sections }: SidebarNavProps) {
  return (
    <nav className="sidebar" aria-label="Main navigation">
      {sections.map((s) => {
        const hover = usePrefetchOnHover(s.id);
        return (
          <button
            key={s.id}
            type="button"
            className={`nav-item ${active === s.id ? 'active' : ''}`}
            onClick={() => onNavigate(s.id)}
            {...hover}
          >
            <span aria-hidden="true">{s.emoji}</span>
            <span>{s.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default SidebarNav;