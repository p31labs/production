import { useState, useEffect } from 'react';

export default function FocusTimer() {
  const [sec, setSec] = useState(25 * 60);
  const [run, setRun] = useState(false);
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');

  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [run]);

  return (
    <div className="companion-card" style={{ textAlign: 'center' }}>
      <h3 style={{ marginBottom: 'var(--p31-space-sm)' }}>Focus Timer</h3>
      <div style={{
        fontSize: 'var(--p31-type-display)',
        fontWeight: 700,
        color: 'var(--p31-accent)',
        margin: 'var(--p31-space-md) 0',
        fontFamily: 'var(--p31-font-mono)',
      }}>
        {mm}:{ss}
      </div>
      <div style={{ display: 'flex', gap: 'var(--p31-space-sm)', justifyContent: 'center' }}>
        <button className="button" onClick={() => setRun((r) => !r)}>
          {run ? 'Pause' : 'Start'}
        </button>
        <button className="button" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--p31-text)', boxShadow: 'none' }} onClick={() => { setSec(25 * 60); setRun(false); }}>
          Reset
        </button>
      </div>
    </div>
  );
}
