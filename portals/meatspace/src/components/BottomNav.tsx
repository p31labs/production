import type { Tab } from '../types';

interface BottomNavProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function BottomNav({ tab, onTabChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" role="tablist" aria-label="Main navigation">
      <button
        className={`nav-item${tab === 'map' ? ' active' : ''}`}
        onClick={() => onTabChange('map')}
        role="tab"
        aria-selected={tab === 'map'}
        id="tab-map"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        <span>Map</span>
      </button>
      <button
        className={`nav-item${tab === 'talk' ? ' active' : ''}`}
        onClick={() => onTabChange('talk')}
        role="tab"
        aria-selected={tab === 'talk'}
        id="tab-talk"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </svg>
        <span>Talk</span>
      </button>
      <button
        className={`nav-item${tab === 'profile' ? ' active' : ''}`}
        onClick={() => onTabChange('profile')}
        role="tab"
        aria-selected={tab === 'profile'}
        id="tab-profile"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="7" r="4" />
          <path d="M5.5 21h13a2 2 0 002-2v-2a4 4 0 00-4-4h-9a4 4 0 00-4 4v2a2 2 0 002 2z" />
        </svg>
        <span>Profile</span>
      </button>
      <button
        className={`nav-item${tab === 'notifications' ? ' active' : ''}`}
        onClick={() => onTabChange('notifications')}
        role="tab"
        aria-selected={tab === 'notifications'}
        id="tab-notifications"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        <span>Notifications</span>
      </button>
    </nav>
  );
}
