import { useAppStore } from '../store/useAppStore';
import { useShellStore } from '../store/useShellStore';
import { useFocusTrap } from '../hooks/useFocusTrap';

function nodeCount(nodes: unknown): number {
  if (!nodes) return 0;
  if (nodes instanceof Map) return nodes.size;
  if (Array.isArray(nodes)) return nodes.length;
  return Object.keys(nodes as Record<string, unknown>).length;
}

interface MeshNode {
  did: string;
  spoons?: number;
  mood?: string;
  role?: string;
  status: string;
  lastSeen?: number;
  publicKey?: string;
}

export default function MeshStatusPanel() {
  const open = useShellStore((s) => s.meshOpen);
  const setOpen = useShellStore((s) => s.setMeshOpen);
  const mesh = useAppStore((s) => s.mesh);
  const localDid = mesh?.localDid ?? '—';
  const { panelRef } = useFocusTrap(open, () => setOpen(false));

  const peers = mesh?.nodes instanceof Map
    ? Array.from(mesh.nodes.values()) as unknown as MeshNode[]
    : Array.isArray(mesh?.nodes)
      ? (mesh!.nodes as unknown as MeshNode[])
      : Object.values((mesh?.nodes ?? {}) as Record<string, MeshNode>);

  const online = peers.filter((n) => n.status === 'online' && n.did !== localDid);
  const connectionCount = online.length;
  const topology = mesh?.topology ?? 'isolated';

  if (!open) return null;

  return (
    <div className="akinator-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }} role="dialog" aria-modal="true" aria-labelledby="mesh-status-panel-title">
      <div className="akinator-panel" ref={panelRef}>
        <div className="akinator-header">
          <span className="akinator-avatar">🕸️</span>
          <h3 className="akinator-title" id="mesh-status-panel-title">Mesh Status</h3>
          <button type="button" className="akinator-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
        </div>
        <div className="akinator-body" style={{ gap: 'var(--p31-space-tiny)' }}>
          <div className="akinator-question-card">
            <div className="akinator-question-label">Your DID</div>
            <p className="akinator-question-text" style={{ fontFamily: 'monospace', fontSize: 'var(--p31-scale-xs)', wordBreak: 'break-all' }}>{localDid.slice(0, 40)}…</p>
          </div>

          <div className="akinator-question-card">
            <div className="akinator-question-label">Topology</div>
            <p className="akinator-question-text">
              {topology === 'delta' ? '🔺 Delta (3+ connections)' : topology === 'wye' ? '⭐ Wye (1-2 connections)' : '⚪ Isolated (no peers)'}
            </p>
          </div>

          <div className="akinator-question-card">
            <div className="akinator-question-label">Connected Peers ({connectionCount})</div>
            {online.length === 0 ? (
              <p className="akinator-candidates-hint">No peers connected yet. The mesh listens for family members on the network.</p>
            ) : (
              <ul className="akinator-suggestions-list">
                {online.slice(0, 10).map((node, i) => (
                  <li key={node.did || i} className="akinator-suggestion-item">
                    <div className="akinator-suggestion-btn" style={{ cursor: 'default' }}>
                      <span className="akinator-suggestion-emoji">{node.spoons != null ? (node.spoons <= 1 ? '🟡' : node.spoons >= 4 ? '🟢' : '🟠') : '⚪'}</span>
                      <div className="akinator-suggestion-body">
                        <div className="akinator-suggestion-name">{node.role || node.did?.slice(0, 12) || 'Peer'}</div>
                        <div className="akinator-suggestion-desc">
                          {node.spoons != null ? `🥄 ${node.spoons}/5` : ''}
                          {node.mood ? ` · ${node.mood}` : ''}
                          {node.status === 'online' ? ' · 🟢 online' : ''}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {mesh?.symmetry != null && (
            <div className="akinator-question-card">
              <div className="akinator-question-label">K₄ State</div>
              <p className="akinator-question-text">
                Symmetry: {typeof mesh.symmetry === 'number' ? (mesh.symmetry * 100).toFixed(0) + '%' : '—'}
                {mesh.curvature != null ? ` · Curvature: ${mesh.curvature >= 0 ? 'positive' : 'negative'}` : ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
