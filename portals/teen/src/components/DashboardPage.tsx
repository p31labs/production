import { useMemo } from 'react';
import FocusTimer from './FocusTimer';
import BreathGuide from './BreathGuide';
import CaptureBoard from './CaptureBoard';
import ArcadeCanvas from './ArcadeCanvas';
import TetrahedronVisualizer from './TetrahedronVisualizer';
import { useAppStore } from '../store/useAppStore';
import { type NodeData } from '@p31/ui';

interface DashboardPageProps {
  active: boolean;
}

export default function DashboardPage({ active }: DashboardPageProps) {
  const mesh = useAppStore((s) => s.mesh);

  const tetraNodes: NodeData[] = useMemo(() => {
    const entries = Object.entries(mesh.nodes || {}) as [string, any][];
    const nodes: NodeData[] = entries.slice(0, 4).map(([did, n]: any, i) => ({
      id: did,
      label: n.name || did.slice(0, 6),
      spoons: n.spoons ?? (i < 3 ? 3 : 0),
      role: i === 0 ? 'teen' : i === 1 ? 'child' : i === 2 ? 'parent' : 'guest',
    }));
    while (nodes.length < 4) {
      nodes.push({ id: `ghost-${nodes.length}`, label: '?', spoons: 0, role: 'ghost' });
    }
    return nodes;
  }, [mesh.nodes]);

  return (
    <section className={`page${active ? ' active' : ''}`} id="page-dashboard" role="tabpanel">
      <h2>🔺 Dashboard — K₄ Mesh</h2>
      <div style={{ background: 'var(--p31-surface)', border: '1px solid var(--p31-glass-border)', borderRadius: 'var(--p31-radius-lg)', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <TetrahedronVisualizer
          nodes={tetraNodes}
          edges={[]}
          phase={1}
          symmetry={Math.round((mesh.symmetry || 0.5) * 100)}
          curvature={mesh.curvature || 0}
          size={300}
        />
      </div>
      <div className="bento-grid">
        <div className="col-span-third">
          <FocusTimer />
        </div>
        <div className="col-span-third">
          <BreathGuide />
        </div>
        <div className="col-span-third">
          <CaptureBoard />
        </div>
      </div>
      <ArcadeCanvas />
    </section>
  );
}
