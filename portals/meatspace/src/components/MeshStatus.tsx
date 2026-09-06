import type { SBT, LoveBalance, MeshState } from '../types';
import { useAppStore } from '../store/useAppStore';

export default function MeshStatus() {
  const mesh = useAppStore((s) => s.mesh);
  const nodes = Object.values(mesh.nodes || {});

  return (
    <div className="companion-card" style={{ marginBottom: 'var(--p31-space-md)' }}>
      <h3 style={{ fontFamily: 'var(--p31-font-display)', fontSize: 'var(--p31-type-h3)', marginBottom: 'var(--p31-space-sm)' }}>
        🌐 Mesh Status
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--p31-space-sm)', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 'var(--p31-type-caption)', color: 'var(--p31-text-secondary)' }}>Topology</div>
          <div style={{ fontWeight: 600 }}>{mesh.topology.toUpperCase()}</div>
        </div>
        <div>
          <div style={{ fontSize: 'var(--p31-type-caption)', color: 'var(--p31-text-secondary)' }}>Symmetry</div>
          <div style={{ fontWeight: 600, color: mesh.symmetry >= 0.95 ? 'var(--p31-accent-green)' : 'var(--p31-accent-gold)' }}>
            {(mesh.symmetry * 100).toFixed(0)}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: 'var(--p31-type-caption)', color: 'var(--p31-text-secondary)' }}>Curvature</div>
          <div style={{ fontWeight: 600, color: mesh.curvature >= 0 ? 'var(--p31-accent-green)' : 'var(--p31-accent-red)' }}>
            {mesh.curvature.toFixed(2)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 'var(--p31-type-caption)', color: 'var(--p31-text-secondary)' }}>Peers</div>
          <div style={{ fontWeight: 600 }}>{nodes.filter((n) => n.status === 'online').length}/3</div>
        </div>
      </div>
      {nodes.length > 0 && (
        <div style={{ marginTop: 'var(--p31-space-sm)', display: 'flex', flexWrap: 'wrap', gap: 'var(--p31-space-xs)' }}>
          {nodes.map((node) => (
            <span
              key={node.did}
              style={{
                padding: '2px 8px',
                borderRadius: 'var(--p31-radius-sm)',
                background: node.status === 'online' ? 'rgba(100, 200, 100, 0.2)' : 'rgba(200, 100, 100, 0.2)',
                border: `1px solid ${node.status === 'online' ? 'var(--p31-accent-green)' : 'var(--p31-accent-red)'}`,
                fontSize: 'var(--p31-type-caption)',
              }}
            >
              {node.did.slice(0, 8)}… {node.status === 'online' ? '🟢' : '🔴'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
