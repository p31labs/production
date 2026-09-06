interface NavItem {
  id: string;
  label: string;
  icon: string;
}

interface BottomNavProps {
  items: NavItem[];
  active: string;
  onChange: (id: string) => void;
}

export default function BottomNav({ items, active, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" role="tablist" aria-label="Main navigation">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={active === item.id}
          className={`bottom-nav-item${active === item.id ? ' active' : ''}`}
          onClick={() => onChange(item.id)}
        >
          <span className="bottom-nav-icon" aria-hidden="true">{item.icon}</span>
          <span className="bottom-nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
