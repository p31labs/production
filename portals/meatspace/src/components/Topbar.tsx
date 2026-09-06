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
}

export default function Topbar({ spoons, onSpoonChange }: TopbarProps) {
  return (
    <header className="topbar" role="banner">
      <div className="topbar-left">
        <span style={{ fontWeight: 600, fontSize: 'var(--p31-type-h3)' }}>BONDING</span>
        <span className="badge">🔗 Connected</span>
      </div>
      <div className="topbar-right">
        <div className="spoon-dial" role="radiogroup" aria-label="Cognitive load" data-a2ui-component="SpoonDial">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              className={`spoon-btn${spoons === level ? ' active' : ''}`}
              onClick={() => onSpoonChange(level)}
              role="radio"
              aria-checked={spoons === level}
            >
              <SpoonIcon />
            </button>
          ))}
          <button
            className={`spoon-btn${spoons === 0 ? ' active' : ''}`}
            onClick={() => onSpoonChange(0)}
            role="radio"
            aria-checked={spoons === 0}
            title="Quiet mode"
          >
            🧘
          </button>
        </div>
      </div>
    </header>
  );
}
