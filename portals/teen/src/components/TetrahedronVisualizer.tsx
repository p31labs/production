import { useRef, useMemo } from 'react';
import {
  type Vec3,
  type Edge,
  type NodeData,
  tetrahedronVertices,
  tetrahedronEdges,
  wyeToDelta,
  sicPovmProjection,
  computeSymmetry,
  computeCurvature,
} from '@p31/ui';

interface TetrahedronVisualizerProps {
  nodes?: NodeData[];
  edges?: Edge[];
  phase?: number;
  symmetry?: number;
  curvature?: number;
  onPhaseChange?: (phase: number) => void;
  showControls?: boolean;
  size?: number;
}

const ROLE_COLORS: Record<string, string> = {
  child: '#FF6B8B',
  teen: '#00F2FE',
  parent: '#3B82F6',
  admin: '#3B82F6',
  guest: '#8B5CF6',
  ghost: '#475569',
};

function fillGhosts(nodes: NodeData[]): NodeData[] {
  const filled = [...nodes];
  while (filled.length < 4) {
    filled.push({ id: `ghost-${filled.length}`, label: '?', spoons: 0, role: 'ghost' });
  }
  return filled.slice(0, 4);
}

export default function TetrahedronVisualizer({
  nodes = [],
  edges: edgeData,
  phase = 1,
  symmetry: symOverride,
  curvature: curvOverride,
  onPhaseChange,
  showControls = false,
  size = 280,
}: TetrahedronVisualizerProps) {
  const dragRef = useRef<{ active: boolean; startX: number; startPhase: number }>({
    active: false,
    startX: 0,
    startPhase: 1,
  });

  const filled = useMemo(() => fillGhosts(nodes), [nodes]);
  const symmetry = symOverride ?? computeSymmetry(filled);
  const curvature = curvOverride ?? computeCurvature(edgeData || []);
  const projected = useMemo(() => sicPovmProjection(tetrahedronVertices()), []);
  const verts = useMemo(() => wyeToDelta(phase, tetrahedronVertices()), [phase]);
  const baseEdges = tetrahedronEdges();
  const curvatureColor = curvature >= 0 ? '#10B981' : '#F43F5E';

  const pad = 40;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const s = (size - pad * 2) / 2.5;

  const toScreen = (v: Vec3): { x: number; y: number } => ({
    x: cx + (v.x || projected[0].x) * s * 0.85,
    y: cy - (v.y || projected[0].y) * s * 0.85 + (v.z || 0) * s * 0.3,
  });

  const handleDragStart = (e: React.PointerEvent) => {
    if (!onPhaseChange) return;
    dragRef.current = { active: true, startX: e.clientX, startPhase: phase };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active || !onPhaseChange) return;
    const dx = (dragRef.current.startX - e.clientX) / 200;
    const p = Math.max(0, Math.min(1, dragRef.current.startPhase + dx));
    onPhaseChange(p);
  };

  const handleDragEnd = () => { dragRef.current.active = false; };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ cursor: showControls ? 'ew-resize' : 'default', userSelect: 'none' }}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
      >
        {/* Edges */}
        {baseEdges.map(([a, b], i) => {
          const p1 = toScreen(verts[a]);
          const p2 = toScreen(verts[b]);
          const edgeWeight = edgeData?.[i]?.weight ?? 0.5;
          const alpha = 0.2 + edgeWeight * 0.6;
          return (
            <line
              key={`e-${i}`}
              x1={p1.x} y1={p1.y}
              x2={p2.x} y2={p2.y}
              stroke={curvatureColor}
              strokeOpacity={alpha}
              strokeWidth={1.5 + edgeWeight * 2}
            />
          );
        })}

        {/* Vertices */}
        {filled.map((node, i) => {
          const v = verts[i];
          const p = toScreen(v);
          const color = ROLE_COLORS[node.role] || '#475569';
          const r = node.role === 'ghost' ? 6 : 10 + node.spoons * 1.5;
          const isGhost = node.role === 'ghost';

          return (
            <g key={`v-${i}`}>
              {isGhost ? (
                <circle cx={p.x} cy={p.y} r={r} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="4,3" opacity={0.5} />
              ) : (
                <>
                  <circle cx={p.x} cy={p.y} r={r + 4} fill={color} opacity={0.15} />
                  <circle cx={p.x} cy={p.y} r={r} fill={color} stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />
                  {node.spoons === 0 && (
                    <circle cx={p.x} cy={p.y} r={r + 6} fill="none" stroke={color} strokeWidth={1} strokeDasharray="3,3" opacity={0.6}>
                      <animate attributeName="stroke-dashoffset" from="0" to="12" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                </>
              )}
              <text
                x={p.x}
                y={p.y + r + 14}
                textAnchor="middle"
                fill={isGhost ? '#475569' : '#E2E8F0'}
                fontSize="10"
                fontFamily="var(--p31-font-mono, monospace)"
              >
                {node.label || node.id.slice(0, 6)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Metrics strip */}
      <div style={{ display: 'flex', gap: '16px', fontSize: '11px', fontFamily: 'var(--p31-font-mono, monospace)', color: 'var(--p31-text-secondary)' }}>
        <span>Sym {symmetry}%</span>
        <span style={{ color: curvatureColor }}>Curv {curvature >= 0 ? '+' : ''}{curvature.toFixed(1)}</span>
        <span style={{ color: phase > 0.66 ? '#10B981' : phase > 0.33 ? '#F59E0B' : '#F43F5E' }}>
          {phase > 0.66 ? 'Delta' : phase > 0.33 ? 'Mixed' : 'Wye'}
        </span>
      </div>

      {/* Phase slider */}
      {showControls && onPhaseChange && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--p31-text-secondary)' }}>
            <span>Wye (Hub)</span>
            <span>Delta (Mesh)</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(phase * 100)}
            onChange={(e) => onPhaseChange(Number(e.target.value) / 100)}
            style={{ width: '100%', accentColor: curvatureColor }}
          />
        </div>
      )}
    </div>
  );
}
