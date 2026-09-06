const SpoonIcon = () => (
  <svg viewBox="0 0 200 200" width="16" height="16">
    <path d="M100 30 Q96 80 100 110 Q100 120 100 145" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
    <ellipse cx="100" cy="145" rx="16" ry="26" fill="currentColor" />
    <circle cx="100" cy="30" r="6" fill="currentColor" />
  </svg>
);

interface TopbarProps {
  spoons: number;
  onSpoonChange: (level: number) => void;
  loveBalance: number | null;
  trustTier: string | null;
  meshStatus: string;
  userName?: string;
  did?: string;
}

export default function Topbar({
  spoons,
  onSpoonChange,
  loveBalance,
  trustTier,
  meshStatus,
  userName,
  did,
}: TopbarProps) {
  return (
    <header id="topbar" role="banner">
      <div className="topbar-logo" role="heading" aria-level={1}>Ⓟ31</div>
      <div className="topbar-metrics">
        <div className="metric-badge">
          💎 <strong id="loveCount">{loveBalance !== null ? loveBalance : '—'}</strong>
        </div>
        <div className="metric-badge">
          <span id="trustBadge">⬡ {trustTier || '—'}</span>
        </div>
        <div className="metric-badge">
          <span id="meshStatus">{meshStatus === 'online' ? '🌐 online' : '📡 offline'}</span>
        </div>
        {userName && <div className="metric-badge">👤 {userName}</div>}
        {did && <div className="metric-badge" style={{ fontSize: '9px', opacity: 0.6 }}>{did.slice(0, 8)}…</div>}
      </div>
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
    </header>
  );
}
