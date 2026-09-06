const SpoonIcon = () => (
  <svg viewBox="0 0 200 200" width="16" height="16">
    <path d="M100 30 Q96 80 100 110 Q100 120 100 145" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
    <ellipse cx="100" cy="145" rx="16" ry="26" fill="currentColor" />
    <circle cx="100" cy="30" r="6" fill="currentColor" />
  </svg>
);

interface TopbarProps {
  spoons: number;
  starCount: number;
  timerSeconds: number;
  userName: string;
  avatar: string;
  onSpoonChange: (level: number) => void;
  onTimerAdd: () => void;
}

export default function Topbar({ spoons, starCount, timerSeconds, userName, avatar, onSpoonChange, onTimerAdd }: TopbarProps) {
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  const timerDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <header id="topbar" role="banner">
      <div className="topbar-left">
        <div className="topbar-avatar">{avatar}</div>
        <div className="topbar-greeting">
          Hello!
          <small>Ready for today?</small>
        </div>
      </div>
      <div className="topbar-metrics">
        <div className="metric-badge" aria-label="Stars earned">
          <span className="emoji">⭐</span>
          <span>{starCount}</span>
        </div>
        <div className="metric-badge" id="timer-badge" aria-label="Session time remaining" title="Tap to extend time" onClick={onTimerAdd}>
          <span className="emoji">⏱️</span>
          <span>{timerDisplay}</span>
        </div>
        <div className="spoon-dial" role="radiogroup" aria-label="Energy level">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              className={`spoon-btn${spoons === level ? ' active' : ''}`}
              onClick={() => onSpoonChange(level)}
              role="radio"
              aria-checked={spoons === level}
              aria-label={`Energy level ${level}`}
            >
              <SpoonIcon />
            </button>
          ))}
          <button
            className={`spoon-btn${spoons === 0 ? ' active' : ''}`}
            onClick={() => onSpoonChange(0)}
            role="radio"
            aria-checked={spoons === 0}
            aria-label="Quiet mode"
          >
            🧘
          </button>
        </div>
      </div>
    </header>
  );
}
