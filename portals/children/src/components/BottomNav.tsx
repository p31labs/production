import type { Tab } from '../types';

interface BottomNavProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function BottomNav({ tab, onTabChange }: BottomNavProps) {
  return (
    <nav id="navbar" role="tablist" aria-label="Main navigation">
      {[
        { key: 'home', icon: '🏠', label: 'Home' },
        { key: 'play', icon: '🎮', label: 'Play' },
        { key: 'create', icon: '🧩', label: 'Create' },
        { key: 'talk', icon: '💬', label: 'Talk' },
        { key: 'learn', icon: '📚', label: 'Learn' },
        { key: 'profile', icon: '👤', label: 'Profile' },
        { key: 'notifications', icon: '🔔', label: 'Notifications' },
      ].map((item) => (
        <button
          key={item.key}
          className={`nav-tab${tab === item.key ? ' active' : ''}`}
          onClick={() => onTabChange(item.key as Tab)}
          role="tab"
          aria-selected={tab === item.key}
          id={`tab-${item.key}`}
          aria-label={item.label}
        >
          <div className="nav-icon">{item.icon}</div>
          <div>{item.label}</div>
        </button>
      ))}
    </nav>
  );
}
