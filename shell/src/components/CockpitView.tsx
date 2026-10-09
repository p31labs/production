import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import SpaceshipEarth from '../features/ship/SpaceshipEarth';
import PageHeader from './PageHeader';
import { coherenceForSpoons } from '../lib/coherence';

export default function CockpitView() {
  const spoons = useAppStore((s) => s.spoons);
  const coherence = useMemo(() => coherenceForSpoons(spoons), [spoons]);

  return (
    <div className="cockpit page-fill" style={{ position: 'relative' }}>
      <PageHeader
        title="Docking Dome"
        icon={<span style={{ fontSize: 28 }}>{'\uD83D\uDE80'}</span>}
        pageKey="cockpit"
        controls={
          <div style={{ textAlign: 'right', fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)', fontFamily: 'monospace', lineHeight: 1.4 }}>
            <div style={{ fontWeight: 700, fontSize: 'var(--p31-scale-sm)', color: 'var(--p31-text)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>K₄</div>
            <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)' }}>drag to orbit · scroll to zoom · click ports</div>
            <div>Ω {coherence.toFixed(3)}</div>
          </div>
        }
      />
      <SpaceshipEarth />
    </div>
  );
}
