import { useState, useEffect } from 'react';
import MonetizationDashboard from './components/MonetizationDashboard';
import Dashboard from './pages/Dashboard';
import Revenue from './pages/Revenue';
import Positions from './pages/Positions';
import Opportunities from './pages/Opportunities';
import Billing from './pages/Billing';
import Usage from './pages/Usage';
import Settings from './pages/Settings';

export type Tab = 'dashboard' | 'revenue' | 'positions' | 'opportunities' | 'billing' | 'usage' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [crisis] = useState<{ message: string; onDismiss: () => void } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('p31-monetization-config');
    if (saved) {
      try {
        JSON.parse(saved);
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'revenue':
        return <Revenue />;
      case 'positions':
        return <Positions />;
      case 'opportunities':
        return <Opportunities />;
      case 'billing':
        return <Billing />;
      case 'usage':
        return <Usage />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <MonetizationDashboard
      activeTab={activeTab}
      onTabChange={setActiveTab}
      crisis={crisis}
    >
      {renderTab()}
    </MonetizationDashboard>
  );
}
