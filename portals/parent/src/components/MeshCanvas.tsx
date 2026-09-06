import { useEffect, useRef } from 'react';

interface MeshCanvasProps {
  spoons: number;
  active: boolean;
}

export default function MeshCanvas({ spoons, active }: MeshCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    let morphFactor = 0;
    let displayW = 0;
    let displayH = 0;

    const vertices = [
      { x: 1, y: 1, z: 0 }, { x: -1, y: 1, z: 0 }, { x: 1, y: -1, z: 0 }, { x: -1, y: -1, z: 0 },
      { x: 1, y: 0, z: 1 }, { x: -1, y: 0, z: 1 }, { x: 1, y: 0, z: -1 }, { x: -1, y: 0, z: -1 },
      { x: 0, y: 1, z: 1 }, { x: 0, y: -1, z: 1 }, { x: 0, y: 1, z: -1 }, { x: 0, y: -1, z: -1 }
    ];
    const edges = [
      [0,4],[0,6],[0,8],[0,10],[1,5],[1,7],[1,8],[1,10],
      [2,4],[2,6],[2,9],[2,11],[3,5],[3,7],[3,9],[3,11],
      [4,8],[4,9],[5,8],[5,9],[6,10],[6,11],[7,10],[7,11]
    ];

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        displayW = rect.width;
        displayH = rect.height;
      }
    };

    const rotate3D = (v: { x: number; y: number; z: number }, p: number, y: number, r: number) => {
      const y1 = v.y * Math.cos(p) - v.z * Math.sin(p);
      const z1 = v.y * Math.sin(p) + v.z * Math.cos(p);
      const x1 = v.x;
      const x2 = x1 * Math.cos(y) + z1 * Math.sin(y);
      const z2 = -x1 * Math.sin(y) + z1 * Math.cos(y);
      const x3 = x2 * Math.cos(r) - y1 * Math.sin(r);
      const y3 = x2 * Math.sin(r) + y1 * Math.cos(r);
      return { x: x3, y: y3, z: z2 };
    };

    const morphVertex = (v: { x: number; y: number; z: number }, m: number) => {
      const mf = 1 - m * 0.35;
      return { x: v.x * mf, y: v.y * mf, z: v.z * mf };
    };

    const project3D = (v: { x: number; y: number; z: number }) => {
      const fov = 600;
      const cx = displayW / 2;
      const cy = displayH / 2;
      const scale = Math.min(cx, cy) * 0.55;
      const p = fov / (fov + v.z * scale);
      return { x: cx + v.x * scale * p, y: cy + v.y * scale * p, z: p };
    };

    const render = () => {
      if (!canvasRef.current) return;
      const w = displayW || canvas.width;
      const h = displayH || canvas.height;
      ctx.clearRect(0, 0, w, h);

      const speed = spoons >= 3 ? 1.0 : spoons / 3;
      time += 0.012 * speed;
      morphFactor = (Math.sin(time * 1.8) + 1) / 2;
      const pitch = time * 0.5;
      const yaw = time * 0.7;
      const roll = time * 0.25;

      const transformed = vertices.map((v) => {
        const morphed = morphVertex(v, morphFactor);
        return rotate3D(morphed, pitch, yaw, roll);
      });

      const projected = transformed.map((v) => project3D(v));

      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(56,189,248,${0.06 + morphFactor * 0.08})`;
      ctx.beginPath();
      edges.forEach((e) => {
        const p1 = projected[e[0]];
        const p2 = projected[e[1]];
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      });
      ctx.stroke();

      const dotAlpha = 0.15 + morphFactor * 0.25;
      ctx.fillStyle = `rgba(167,139,250,${dotAlpha})`;
      projected.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener('resize', resize);
    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [active, spoons]);

  return (
    <canvas
      ref={canvasRef}
      id="jitterbugCanvas"
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
