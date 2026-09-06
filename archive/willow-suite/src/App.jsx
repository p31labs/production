import { useState, useEffect, lazy, Suspense } from 'react';
import { useSpoonStore } from './store/useSpoonStore';
import { useThemeStore } from './store/useThemeStore';
import PortalLoader from './components/PortalLoader';

const ChildPortal = lazy(() => import('./portals/ChildPortal'));
const TeenPortal = lazy(() => import('./portals/TeenPortal'));
const AdminPortal = lazy(() => import('./portals/AdminPortal'));

export default function App() {
  const [activePortal, setActivePortal] = useState(() => {
    return localStorage.getItem('willow-active-portal') || 'child';
  });

  const childSpoons = useSpoonStore((s) => s.childSpoons);
  const teenSpoons = useSpoonStore((s) => s.teenSpoons);
  const setChildSpoons = useSpoonStore((s) => s.setChildSpoons);
  const setTeenSpoons = useSpoonStore((s) => s.setTeenSpoons);
  const logSpoonChange = useSpoonStore((s) => s.logSpoonChange);

  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const cycleTheme = useThemeStore((s) => s.cycleTheme);

  const isChildResting = activePortal === 'child' && childSpoons === 0;
  const isTeenResting = activePortal === 'teen' && teenSpoons === 0;
  const isResting = isChildResting || isTeenResting;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('willow-active-portal', activePortal);
  }, [activePortal]);

  const handleSetChildSpoons = (n) => {
    setChildSpoons(n);
    logSpoonChange('Child', n);
  };

  const handleSetTeenSpoons = (n) => {
    setTeenSpoons(n);
    logSpoonChange('Teen', n);
  };

  const handleRecharge = () => {
    if (activePortal === 'child') {
      handleSetChildSpoons(3);
    } else if (activePortal === 'teen') {
      handleSetTeenSpoons(3);
    }
  };

  return (
    <div className="suite-wrapper">
      <header className="portal-switcher">
        <div className="brand-logo">
          <span>WILLOW</span>
          <span className="brand-badge">SOVEREIGN SUITE</span>
        </div>

        <nav className="portal-tabs">
          <button
            className={`portal-tab-btn ${activePortal === 'child' ? 'active-child' : ''}`}
            onClick={() => setActivePortal('child')}
          >
            🎈 Child Portal EDE
          </button>

          <button
            className={`portal-tab-btn ${activePortal === 'teen' ? 'active-teen' : ''}`}
            onClick={() => setActivePortal('teen')}
          >
            ⚡ Teen Portal EDE
          </button>

          <button
            className={`portal-tab-btn ${activePortal === 'admin' ? 'active-admin' : ''}`}
            onClick={() => setActivePortal('admin')}
          >
            🛡️ Parent Admin EDE
          </button>
        </nav>

        <div className="switcher-actions">
          <button onClick={cycleTheme} className="switcher-theme-btn" title="Cycle theme">
            {theme === 'dark' ? '🌙' : theme === 'slate' ? '⛰️' : '❄️'}
          </button>
          <span className="switcher-mesh-status">LOCAL MESH: ONLINE</span>
        </div>
      </header>

      <main className="portal-content">
        {isResting && (
          <div className="sensory-rest-overlay">
            <span className="rest-icon">🌙</span>
            <h2 className="rest-title">Sensory Rest Time</h2>
            <p className="rest-text">
              Energy Spoons hit zero. Take a short pause to rest your eyes and recharge.
            </p>
            <button onClick={handleRecharge} className="rest-recharge-btn">
              ⚡ Recharge Spoons
            </button>
          </div>
        )}

        <Suspense fallback={<PortalLoader portal={activePortal} />}>
          {activePortal === 'child' && (
            <ChildPortal spoons={childSpoons} setSpoons={handleSetChildSpoons} />
          )}

          {activePortal === 'teen' && (
            <TeenPortal spoons={teenSpoons} setSpoons={handleSetTeenSpoons} />
          )}

          {activePortal === 'admin' && (
            <AdminPortal
              childSpoons={childSpoons}
              setChildSpoons={handleSetChildSpoons}
              teenSpoons={teenSpoons}
              setTeenSpoons={handleSetTeenSpoons}
            />
          )}
        </Suspense>
      </main>
    </div>
  );
}
