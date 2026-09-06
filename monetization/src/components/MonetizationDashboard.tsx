import { useState, useEffect } from 'react';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import SpoonDial from './SpoonDial';
import Starfield from './Starfield';
import CrisisOverlay from './CrisisOverlay';
import StatusBanner from './StatusBanner';
import { loadConfig } from '../config';

const config = loadConfig();

export type Tab = 'dashboard' | 'revenue' | 'positions' | 'opportunities' | 'billing' | 'usage' | 'settings';

interface MonetizationDashboardProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  children: React.ReactNode;
  crisis?: { message: string; onDismiss: () => void } | null;
}

export default function MonetizationDashboard({
  activeTab,
  onTabChange,
  children,
  crisis,
}: MonetizationDashboardProps) {
  const [spoons, setSpoons] = useState(3);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-spoons', String(spoons));
  }, [spoons]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'revenue', label: 'Revenue', icon: '💰' },
    { id: 'positions', label: 'Positions', icon: '📈' },
    { id: 'opportunities', label: 'Opportunities', icon: '⚡' },
    { id: 'billing', label: 'Billing', icon: '💳' },
    { id: 'usage', label: 'Usage', icon: '📶' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ] as const;

  return (
    <div className="monetization-shell">
      {config.theme.ambient && <Starfield />}
      <Topbar
        brand={
          <span className="topbar-brand-text">
            <span className="topbar-brand-icon">◈</span>
            <span className="topbar-brand-label">Capital Machine</span>
          </span>
        }
        center={
          <div className="topbar-metrics">
            <span className="topbar-metric-badge">
              <span className="status-dot status-dot-live" /> Live
            </span>
            <span className="topbar-metric-badge">$3.00 USDC</span>
          </div>
        }
        right={
          config.theme.spoonDial ? (
            <SpoonDial value={spoons} onChange={setSpoons} />
          ) : undefined
        }
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className={`monetization-layout${sidebarOpen ? ' sidebar-open' : ''}`}>
        <aside className="monetization-sidebar" aria-label="Navigation">
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`sidebar-nav-item${activeTab === item.id ? ' active' : ''}`}
                onClick={() => {
                  onTabChange(item.id);
                  setSidebarOpen(false);
                }}
              >
                <span className="sidebar-nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="sidebar-nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="monetization-main">
          <StatusBanner />
          {children}
        </main>
      </div>

      <BottomNav
        items={navItems.map((item) => ({ id: item.id, label: item.label, icon: item.icon }))}
        active={activeTab}
        onChange={(id) => onTabChange(id as Tab)}
      />

      {crisis && (
        <CrisisOverlay
          message={crisis.message}
          onDismiss={crisis.onDismiss}
        />
      )}
    </div>
  );
}
