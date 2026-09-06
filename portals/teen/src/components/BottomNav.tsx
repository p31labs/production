import type { Tab } from '../types';

interface BottomNavProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
}

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'code', label: 'Code', icon: '💻' },
  { key: 'bonding', label: 'Bonding', icon: '🧬' },
  { key: 'talk', label: 'Talk', icon: '💬' },
  { key: 'profile', label: 'Profile', icon: '👤' },
  { key: 'notifications', label: 'Notifications', icon: '🔔' },
];

export default function BottomNav({ tab, onTabChange }: BottomNavProps) {
  return (
    <nav id="navbar" role="tablist" aria-label="Tabs">
      {TABS.map((item) => (
        <button
          key={item.key}
          className={`nav-tab${tab === item.key ? ' active' : ''}`}
          onClick={() => onTabChange(item.key)}
          role="tab"
          aria-selected={tab === item.key}
        >
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
