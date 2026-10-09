// NodeActions — action menu opened by clicking a dome node.
// Renders as a small floating card anchored near the clicked node; actions are
// source-aware (mark that source's notifications read). Source string is the
// notification source family the node maps to.
import { useEffect } from 'react';
import { useShellStore } from '../../store/useShellStore';
import { useAppStore } from '../../store/useAppStore';

export interface ActiveNode {
  index: number;
  source: string;
  x: number;
  y: number;
}

export default function NodeActions({ node, onClose }: { node: ActiveNode | null; onClose: () => void }) {
  const markSourceRead = useShellStore((s) => s.markSourceRead);
  const showToast = useAppStore((s) => s.showToast);
  const notifications = useShellStore((s) => s.notifications);

  const sourceUnread = node ? notifications.filter((n) => !n.read && n.source === node.source).length : 0;

  useEffect(() => {
    if (!node) return;
    if (import.meta.env.MODE !== 'production' || (typeof window !== 'undefined' && (window as any).__P31_VERIFY__)) {
      (window as any).__p31_activeNode = { index: node.index, source: node.source };
    }
  }, [node]);

  if (!node) return null;

  const clampedX = Math.max(12, Math.min(node.x, window.innerWidth - 240));
  const clampedY = Math.max(12, Math.min(node.y, window.innerHeight - 160));

  const onMarkRead = () => {
    markSourceRead(node.source);
    showToast(`✅ ${node.source} notifications marked read`, 'success');
    onClose();
  };

  return (
    <div
      className="node-actions"
      data-node-source={node.source}
      style={{ left: clampedX, top: clampedY }}
    >
      <div className="node-actions-head">
        <span>◉ Node {node.index}</span>
        <span className="node-actions-source">{node.source}</span>
      </div>
      <div className="node-actions-body">
        <div style={{ fontSize: 10.5, color: 'var(--p31-text-tertiary)' }}>{sourceUnread} unread from this source family</div>
      </div>
      <div className="node-actions-actions">
        <button type="button" className="btn ghost" onClick={onMarkRead}>Mark this source read</button>
        <button type="button" className="btn ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
