import type { Tab } from '../types';

const SpoonIcon = () => (
  <svg viewBox="0 0 200 200" width="16" height="16">
    <path d="M100 30 Q96 80 100 110 Q100 120 100 145" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
    <ellipse cx="100" cy="145" rx="16" ry="26" fill="currentColor" />
    <circle cx="100" cy="30" r="6" fill="currentColor" />
  </svg>
);

interface TopbarProps {
  tab: Tab;
  spoons: number;
  onTabChange: (tab: Tab) => void;
  onSpoonChange: (level: number) => void;
  loveBalance: number | null;
  walletConnected: boolean;
  onConnectWallet: () => void;
}

export default function Topbar({ tab, spoons, onTabChange, onSpoonChange, loveBalance, walletConnected, onConnectWallet }: TopbarProps) {
  const active = true;
  return (
    <header className="topbar">
      <div className="topbar-left">
        P H O S
        <span className="badge">ADMIN</span>
      </div>

      <div className="topbar-center">
        <nav className="admin-tabs">
          {([
            { key: 'dashboard', label: 'DASHBOARD' },
            { key: 'guardrails', label: 'POLICIES' },
            { key: 'sandbox', label: 'SANDBOX' },
            { key: 'talk', label: 'TALK' },
            { key: 'profile', label: 'PROFILE' },
          ]).map((t) => (
            <button
              key={t.key}
              className={`admin-tab${tab === t.key ? ' active' : ''}`}
              onClick={() => onTabChange(t.key as Tab)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="topbar-right">
        {active && loveBalance !== null && (
          <span className="badge" style={{ background: 'var(--p31-accent-green)', color: '#000' }}>
            {loveBalance} LOVE
          </span>
        )}
        <span className="status-dot" title={active ? 'All Systems Operational' : 'Offline'} />
        <div className="spoon-dial" role="radiogroup" aria-label="Spoon level">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              className={`spoon-btn${spoons === level ? ' active' : ''}`}
              onClick={() => onSpoonChange(level)}
              role="radio"
              aria-checked={spoons === level}
              aria-label={`Spoon level ${level}`}
            >
              <SpoonIcon />
            </button>
          ))}
          <button
            className={`spoon-btn${spoons === 0 ? ' active' : ''}`}
            onClick={() => onSpoonChange(0)}
            role="radio"
            aria-checked={spoons === 0}
            aria-label="Sensory rest mode"
          >
            🧘
          </button>
        </div>
        {!walletConnected && active && (
          <button className="btn" onClick={onConnectWallet} style={{ fontSize: '10px', padding: '4px 8px', minHeight: '24px' }}>Connect</button>
        )}
      </div>
    </header>
  );
}
