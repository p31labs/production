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
    <div style={{ textAlign: 'center' }}>
      <div className="card-header">Breath Guide</div>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '140px',
        margin: 'var(--p31-space-md) 0',
      }}>
        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          border: '2px solid var(--site-accent)',
          transition: 'transform 4s ease-in-out, opacity 4s ease-in-out',
          transform: breath === 'in' ? 'scale(0.8)' : 'scale(1.15)',
          opacity: breath === 'in' ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--p31-font-mono)',
          color: 'var(--site-accent)',
        }}>
          {breath === 'in' ? '⬆' : '⬇'}
        </div>
      </div>
      <div style={{ fontSize: 'var(--p31-type-caption)', color: 'var(--site-text-dim)', marginBottom: 'var(--p31-space-md)' }}>
        {breath === 'in' ? 'Breathe in\u2026' : 'Breathe out\u2026'}
      </div>
      <button className="btn secondary" onClick={() => setActive(!active)}>
        {active ? 'Pause' : 'Resume'}
      </button>
    </div>
  );
}
