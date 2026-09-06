import { useEffect, useRef } from 'react';

export interface K4NodeInfo {
  did: string;
  status: 'online' | 'away' | 'offline';
  label: string;
}

export interface K4TopologyViewProps {
  active: boolean;
  topology: 'delta' | 'wye' | 'isolated';
  symmetry: number;
  curvature: number;
  nodes: K4NodeInfo[];
  localDid?: string;
}

const VERTICES: { x: number; y: number; z: number }[] = [
  { x: 0, y: -1, z: 0 },
  { x: 0.9428, y: 0.3333, z: 0 },
  { x: -0.4714, y: 0.3333, z: 0.8165 },
  { x: -0.4714, y: 0.3333, z: -0.8165 },
];

const EDGES: [number, number][] = [
  [0, 1], [0, 2], [0, 3],
  [1, 2], [1, 3], [2, 3],
];

const STATUS_COLOR: Record<string, string> = {
  online: 'rgba(52,211,153,0.9)',
  away: 'rgba(251,191,36,0.9)',
  offline: 'rgba(248,113,113,0.6)',
};

const TOPOLOGY_LABEL: Record<string, string> = {
  delta: 'Δ Delta — fully connected',
  wye: 'Y Wye — partial mesh',
  isolated: '· Isolated',
};

export default function K4TopologyView({ active, topology, symmetry, curvature, nodes, localDid }: K4TopologyViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({ topology, symmetry, curvature, nodes });
  propsRef.current = { topology, symmetry, curvature, nodes };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    let animId: number;
    let time = 0;

    const draw = () => {
      if (!canvasRef.current) return;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const p = propsRef.current;
      const activeCount = p.nodes.filter((n) => n.status === 'online' || n.status === 'away').length;
      const activeEdges = p.topology === 'delta' ? 6 : p.topology === 'wye' ? Math.min(3 + activeCount, 6) : Math.max(activeCount, 1);

      time += 0.016;

      ctx.save();
      ctx.translate(w / 2, h / 2 - 10);
      const base = Math.min(w, h) * 0.32;
      const breathe = 1 + 0.02 * Math.sin(time * 1.5);
      const scale = base * breathe;

      for (let i = 0; i < EDGES.length; i++) {
        const [a, b] = EDGES[i];
        const va = VERTICES[a];
        const vb = VERTICES[b];
        const active = i < activeEdges;

        const pulse = 0.5 + 0.5 * Math.sin(time * 2 + i);
        ctx.beginPath();
        ctx.moveTo(va.x * scale, va.y * scale);
        ctx.lineTo(vb.x * scale, vb.y * scale);
        ctx.strokeStyle = active
          ? `rgba(0,240,255,${0.25 + pulse * 0.35})`
          : 'rgba(0,240,255,0.06)';
        ctx.lineWidth = active ? 1.5 + pulse * 1.5 : 1;
        ctx.stroke();
      }

      for (let i = 0; i < VERTICES.length; i++) {
        const v = VERTICES[i];
        const info = p.nodes[i];
        const color = info?.status ? STATUS_COLOR[info.status] : 'rgba(255,255,255,0.2)';
        const pulse = 1 + 0.15 * Math.sin(time * 2 + i);

        ctx.beginPath();
        ctx.arc(v.x * scale, v.y * scale, 9 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(v.x * scale, v.y * scale, 9 * pulse + 4, 0, Math.PI * 2);
        ctx.strokeStyle = color.replace('0.9', '0.25').replace('0.6', '0.15');
        ctx.lineWidth = 1;
        ctx.stroke();

        if (info?.status === 'online' || info?.status === 'away') {
          ctx.beginPath();
          ctx.arc(v.x * scale, v.y * scale, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.fill();
        }
      }

      ctx.restore();

      const label = p.topology === 'delta' ? 'Δ Delta' : p.topology === 'wye' ? 'Y Wye' : '· Isolated';
      ctx.fillStyle = 'rgba(148,163,184,0.9)';
      ctx.font = '12px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${label} · ${activeCount}/3 peers`, w / 2, 22);

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  const label = TOPOLOGY_LABEL[topology] ?? '· Isolated';
  const activeCount = nodes.filter((n) => n.status === 'online' || n.status === 'away').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-sm)', height: '100%', minHeight: '360px' }}>
      <div style={{ fontSize: 'var(--p31-type-caption)', color: 'var(--p31-text-secondary)', fontFamily: 'var(--p31-font-mono, monospace)' }}>
        {label}
      </div>
      <div style={{ flex: 1, position: 'relative', minHeight: '300px' }}>
        <canvas ref={canvasRef} id="k4-topology" style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
      <div style={{ display: 'flex', gap: 'var(--p31-space-lg)', flexWrap: 'wrap', fontSize: 'var(--p31-type-caption)', fontFamily: 'var(--p31-font-mono, monospace)' }}>
        <span style={{ color: 'var(--p31-accent, #00F0FF)' }}>◐ Symmetry {Math.round(symmetry * 100)}%</span>
        <span style={{ color: 'var(--p31-accent-violet, #A78BFA)' }}>◍ Curvature {curvature.toFixed(2)}</span>
        <span style={{ color: 'var(--p31-accent-green, #34D399)' }}>
          {nodes.length > 0
            ? nodes.map((n, i) => `${n.label}:${n.status === 'online' ? '●' : n.status === 'away' ? '◐' : '○'}`).join(' ')
            : 'waiting for peers…'}
        </span>
      </div>
    </div>
  );
}
