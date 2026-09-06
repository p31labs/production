import type { Tab } from '../types';

interface BottomNavProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
}

const NAV_ITEMS = [
  { key: 'dashboard', icon: '📊', label: 'Dashboard' },
  { key: 'guardrails', icon: '🛡️', label: 'Policies' },
  { key: 'sandbox', icon: '🧪', label: 'Sandbox' },
  { key: 'talk', icon: '💬', label: 'Talk' },
  { key: 'profile', icon: '👤', label: 'Profile' },
  { key: 'notifications', icon: '🔔', label: 'Notifications' },
] as const;

export default function BottomNav({ tab, onTabChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.key}
          className={`nav-item${tab === item.key ? ' active' : ''}`}
          onClick={() => onTabChange(item.key as Tab)}
        >
          <span style={{ fontSize: '18px' }}>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
