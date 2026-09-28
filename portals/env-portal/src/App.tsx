import { EnvSurface } from './EnvSurface';
import { useSpoonsStore } from './useSpoonsStore';

export default function App() {
  const spoons = useSpoonsStore((s) => s.spoons);
  const setSpoons = useSpoonsStore((s) => s.setSpoons);

  return (
    <div className="env-shell" data-spoons={spoons}>
      <header className="env-topbar">
        <div className="env-brand">
          <span className="env-crown" aria-hidden="true">31</span>
          <span className="env-title">Env</span>
        </div>
        <span className="env-sub">P31 Quantum Material · secret command center — every key, one surface.</span>
        <div className="spoon-dial" aria-label="Spoon Dial Energy Selector">
          <span className="spoon-dial-label">SPOONS</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`spoon-dot${n <= spoons ? ' active' : ''}`}
              onClick={() => setSpoons(n)}
              aria-label={`Set spoon level ${n}`}
            />
          ))}
          <button type="button" className="spoon-crisis-btn" onClick={() => setSpoons(0)}>Calm</button>
        </div>
      </header>
      <main className="env-main">
        <EnvSurface />
      </main>
    </div>
  );
}