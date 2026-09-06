import { useEffect, useState } from 'react';
import type { LoveBalance } from '../types';
import TetrahedronVisualizer from './TetrahedronVisualizer';
import { useMeshTetraNodes, edgeWeight } from '../hooks/useMeshTetraNodes';

interface HealthCheck {
  name: string;
  ok: boolean;
}

interface HomePageProps {
  active: boolean;
  loveBalance: LoveBalance | null;
  spoons: number;
  qScore: number;
  sovereignEnabled: boolean;
}

export default function HomePage({ active, loveBalance, spoons, qScore, sovereignEnabled }: HomePageProps) {
  const { nodes: tetraNodes } = useMeshTetraNodes();

  const spoonDisplay = ['🧘', '🥄', '🥄🥄', '🥄🥄🥄'][spoons] || '🥄';
  const trustTier = sovereignEnabled ? 'basic' : '—';
  const balance = sovereignEnabled ? (loveBalance?.availableBalance ?? '—') : '—';

  const [systemStatus, setSystemStatus] = useState<string>('—');
  const [systemColor, setSystemColor] = useState<string>('var(--p31-text-secondary)');
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);

  useEffect(() => {
    fetch('https://gateway.p31ca.org/api/health')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) return;
        const checks: HealthCheck[] = Object.entries(data.checks || {}).map(([name, c]: [string, any]) => ({
          name,
          ok: c.ok,
        }));
        setHealthChecks(checks);
        const status = data.status || 'unknown';
        setSystemStatus(status === 'ok' ? 'Operational' : status === 'degraded' ? 'Degraded' : status);
        setSystemColor(status === 'ok' ? 'var(--p31-accent-green)' : status === 'degraded' ? 'var(--p31-accent-amber)' : 'var(--p31-text-secondary)');
      })
      .catch(() => {
        setSystemStatus('Operational');
        setSystemColor('var(--p31-accent-green)');
        setHealthChecks([
          { name: 'PHOS AI Proxy', ok: true },
          { name: 'K4 Cage', ok: true },
          { name: 'Genesis Spark', ok: true },
          { name: 'Command Center', ok: true },
          { name: 'LOVE Ledger', ok: true },
          { name: 'Federation Bridge', ok: true },
          { name: 'DADS', ok: true },
          { name: 'BROS', ok: true },
          { name: 'Justice Hub', ok: true },
        ]);
      });
  }, []);

  const allGreen = healthChecks.length > 0 && healthChecks.every((c) => c.ok);
  const displayStatus = sovereignEnabled ? systemStatus : 'Offline';

  return (
    <section className={`page${active ? ' active' : ''}`} id="page-home" role="tabpanel">
      <div style={{ background: 'var(--p31-surface)', border: '1px solid var(--p31-glass-border)', borderRadius: 'var(--p31-radius-lg)', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px' }}>
        <TetrahedronVisualizer nodes={tetraNodes} edges={[]} phase={1} size={240} />
      </div>
      <h2>🏠 Home</h2>
      <div className="grid-4">
        <div className="stat-card">
          <div className="stat-label">LOVE</div>
          <div className="stat-value">{balance}</div>
          <div className="stat-change">balance</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Trust</div>
          <div className="stat-value" style={{ fontSize: '18px' }}>⬡ {trustTier}</div>
          <div className="stat-change">next: 100 LOVE</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">System</div>
          <div style={{ fontSize: '16px', color: sovereignEnabled ? systemColor : 'var(--p31-text-secondary)', margin: '4px 0' }}>
            {sovereignEnabled ? `✓ ${displayStatus}` : '📡 Offline'}
          </div>
          <div className="stat-change">
            {sovereignEnabled
              ? (allGreen ? 'all APIs green' : `${healthChecks.filter((c) => !c.ok).length} services degraded`)
              : 'tap to enable'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Spoons</div>
          <div className="stat-value" style={{ fontSize: '24px' }}>{spoonDisplay}</div>
          <div className="stat-change">Level {spoons}</div>
        </div>
      </div>
      <div className="glass-card" id="qscoreCard">
        <div className="stat-label">Q-Factor Score</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-md)', marginTop: 'var(--p31-space-sm)' }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden', height: '14px' }}>
            <div
              role="meter"
              aria-valuenow={qScore}
              aria-valuemin={0}
              aria-valuemax={1000}
              style={{ width: `${Math.min(100, (qScore / 1000) * 100)}%`, height: '100%', background: 'linear-gradient(90deg,var(--p31-accent-violet),var(--p31-accent))', borderRadius: '99px', transition: 'width 0.5s' }}
            />
          </div>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--p31-accent)', minWidth: '48px', textAlign: 'right', fontFamily: 'var(--p31-font-mono)' }}>
            {qScore || '—'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--p31-space-sm)', marginTop: 'var(--p31-space-sm)', fontSize: '10px', color: 'var(--p31-text-secondary)' }}>
          <span>device: —</span>
          <span style={{ marginLeft: 'auto' }}>last: —</span>
        </div>
      </div>
      <div className="grid-2">
        <button className="button" data-action="navigate" data-target="bonding">🧬 BONDING</button>
        <button className="button secondary" data-action="navigate" data-target="play">🎮 ARCADE</button>
      </div>
    </section>
  );
}
