import { useState, useEffect } from 'react';

export default function BreathGuide() {
  const [breath, setBreath] = useState<'in' | 'out'>('in');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setBreath((b) => (b === 'in' ? 'out' : 'in')), 4000);
    return () => clearInterval(t);
  }, [active]);

  return (
    <div className="glass-card" style={{ textAlign: 'center' }}>
      <div className="stat-label">Breath Guide</div>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '120px',
        margin: 'var(--p31-space-md) 0',
      }}>
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          border: '2px solid var(--p31-accent)',
          transition: 'transform 4s ease-in-out, opacity 4s ease-in-out',
          transform: breath === 'in' ? 'scale(0.8)' : 'scale(1.15)',
          opacity: breath === 'in' ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--p31-font-mono)',
          color: 'var(--p31-accent)',
        }}>
          {breath === 'in' ? '⬆' : '⬇'}
        </div>
      </div>
      <div style={{ fontSize: 'var(--p31-type-caption)', color: 'var(--p31-text-secondary)', marginBottom: 'var(--p31-space-md)' }}>
        {breath === 'in' ? 'Breathe in\u2026' : 'Breathe out\u2026'}
      </div>
      <button className="button secondary" onClick={() => setActive(!active)}>
        {active ? 'Pause' : 'Resume'}
      </button>
    </div>
  );
}
