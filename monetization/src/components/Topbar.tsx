import { useSpoonsStore } from '../lib/useSpoonsStore';
import { useIdentityStore } from '../lib/useIdentityStore';
import { shortDid } from '../lib/identity';

interface TopbarProps {
  onOpenPalette: () => void;
  onHome: () => void;
  live: boolean;
}

/** Topbar — suite chrome (crown brand, center search, spoon dial + live badge + avatar). */
export function Topbar({ onOpenPalette, onHome, live }: TopbarProps) {
  const spoons = useSpoonsStore((s) => s.spoons);
  const setSpoons = useSpoonsStore((s) => s.setSpoons);
  const identity = useIdentityStore((s) => s.identity);
  const connecting = useIdentityStore((s) => s.connecting);
  const connect = useIdentityStore((s) => s.connect);

  return (
    <header className="topbar">
      <button type="button" className="topbar-brand" onClick={onHome}>
        <div className="p31-crown-logo">31</div>
        <span>Capital Machine</span>
      </button>

      <div className="topbar-center">
        <button type="button" className="search-box" onClick={onOpenPalette} aria-label="Open Command Palette">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Search surfaces or run a command…</span>
          <kbd className="search-kbd">⌘K</kbd>
        </button>
      </div>

      <div className="topbar-right">
        <span className={`badge ${live ? 'badge-spark' : 'badge-workshop'}`}>
          <span className="status-dot status-dot-live" aria-hidden="true" />
          {live ? 'LIVE' : 'DEGRADED'}
        </span>

        <button
          type="button"
          className="identity-chip"
          onClick={() => { if (!identity) void connect(); }}
          title={identity ? identity.did : 'Create your sovereign identity'}
        >
          {identity ? shortDid(identity.did) : connecting ? 'Creating…' : '✦ Connect identity'}
        </button>

        <div className="spoon-dial" aria-label="Spoon Dial Energy Selector">
          <span className="spoon-dial-label">SPOONS</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`spoon-dot ${n <= spoons ? 'active' : ''}`}
              onClick={() => setSpoons(n)}
              aria-label={`Set spoon level ${n}`}
            />
          ))}
          <button type="button" className="spoon-crisis-btn" onClick={() => setSpoons(0)}>Calm</button>
        </div>

        <div className="avatar" aria-label="Operator profile">A</div>
      </div>
    </header>
  );
}

export default Topbar;