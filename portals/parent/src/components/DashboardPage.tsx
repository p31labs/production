import { useMemo } from 'react';
import type { LoveBalance } from '@p31/sovereign-core';
import { useAppStore } from '../store/useAppStore';
import TetrahedronVisualizer from './TetrahedronVisualizer';
import { type NodeData } from '@p31/ui';
import { useMeshTetraNodes, edgeWeight } from '../hooks/useMeshTetraNodes';

interface DashboardPageProps {
  active: boolean;
}

export default function DashboardPage({ active }: DashboardPageProps) {
  const spoons = useAppStore((s) => s.spoons);
  const loveBalance = useAppStore((s) => s.loveBalance);
  const { nodes, peers } = useMeshTetraNodes();

  const tetraEdges = useMemo(() => {
    const edges: { a: number; b: number; weight: number }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        edges.push({ a: i, b: j, weight: edgeWeight(nodes[i], nodes[j]) });
      }
    }
    return edges;
  }, [nodes]);

  const edgeCount = tetraEdges.filter(e => e.weight > 0).length;

  const isRigid = useMemo(() => {
    const active = nodes.filter(n => n.spoons > 0 && n.role !== 'ghost').length;
    return (active * (active - 1) / 2) >= 3 * Math.max(1, active) - 6;
  }, [nodes]);

  return (
    <div className={active ? 'page active' : 'page'} id="page-dashboard">
      <div className="app-grid">
        {/* Left Panel — Members */}
        <div className="panel glass">
          <div className="panel-header">
            <span>👨‍👩‍👧‍👦 MEMBERS</span>
            <span style={{ color: 'var(--p31-accent-green)', fontSize: '10px' }}>
              {nodes.filter(n => n.spoons > 0).length} active
            </span>
          </div>
          <div className="panel-body">
            {nodes.length === 0 ? (
              <div className="member-card" style={{ textAlign: 'center', padding: '24px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔺</div>
                <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-secondary)' }}>
                  No members connected.
                </div>
                <div style={{ fontSize: '10px', color: 'var(--p31-text-tertiary)', marginTop: '4px' }}>
                  Members appear when mesh peers join.
                </div>
              </div>
            ) : (
              nodes.filter(n => n.spoons > 0).map((node) => (
                <div key={node.id} className="member-card">
                  <div className="member-card-header">
                    <span
                      className="member-name"
                      style={{ color: node.role === 'child' ? '#FF6B8B' : node.role === 'teen' ? '#00F2FE' : node.role === 'admin' ? '#3B82F6' : '#8B5CF6' }}
                    >
                      {node.label}
                    </span>
                    <span className="member-status online">● Active</span>
                  </div>
                  <div className="spoon-admin-row">
                    <span className="spoon-admin-label">Spoons: {node.spoons}/5</span>
                    <div className="spoon-admin-pills">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <div key={s} className={`spoon-admin-pill${s <= node.spoons ? ` active ${node.role === 'child' ? 'child' : node.role === 'teen' ? 'teen' : 'self'}` : ''}`} />
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center Panel — Tetrahedron */}
        <div className="panel glass">
          <div className="panel-header">
            <span>🔺 TETRAHEDRON MESH</span>
            <span style={{ fontSize: '10px', color: isRigid ? 'var(--p31-accent-green)' : 'var(--p31-accent-red)' }}>
              {isRigid ? 'Rigid' : 'Fragile'}
            </span>
          </div>
          <div className="panel-body" style={{ alignItems: 'center', justifyContent: 'center', padding: '8px', gap: '4px' }}>
            <TetrahedronVisualizer
              nodes={nodes.length ? nodes : [{ id: 'ghost-0', label: '?', spoons: 0, role: 'ghost' }]}
              edges={[]}
              phase={nodes.length >= 4 ? 1 : nodes.length >= 2 ? 0.5 : 0.25}
              showControls={true}
              size={260}
            />
            <div style={{
              fontSize: '10px', color: 'var(--p31-text-secondary)', fontFamily: 'var(--p31-font-mono)',
              padding: '4px 10px', background: 'var(--p31-surface2)', borderRadius: 'var(--p31-radius-sm)',
              textAlign: 'center', width: '100%',
            }}>
              🛡️ Maxwell rigidity: E≥3V−6 → {edgeCount}≥{3 * Math.max(1, nodes.filter(n => n.spoons > 0).length) - 6} {isRigid ? '✓' : '✗'}
            </div>
          </div>
        </div>

        {/* Right Panel — Copilot */}
        <div className="panel glass">
          <div className="panel-header">
            <span>🤖 PHOS COPILOT</span>
          </div>
          <div className="copilot-chat">
            <div className="copilot-bubble ai">
              PHOS Admin online. System services running normally.
            </div>
            <div className="copilot-bubble ai">
              {nodes.length === 0
                ? 'No members connected yet. Mesh peers will appear as the tetrahedron grows.'
                : `${nodes.filter(n => n.spoons > 0).length} member${nodes.length !== 1 ? 's' : ''} active. Family energy: ${nodes.reduce((s, n) => s + n.spoons, 0)}/20 spoons.`
              }
              {!isRigid && ' Consider adding more mesh connections for rigidity.'}
            </div>
          </div>
          <div className="copilot-input-bar">
            <input type="text" className="copilot-input" placeholder="Ask Co-Pilot or type command..." />
            <button className="copilot-send">Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
