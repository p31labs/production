import { useEffect, useRef } from 'react';

interface ArcadeCanvasProps {
  mode?: 'starfield' | 'nebula' | 'matrix';
  spoons?: number;
}

const COLORS = ['#00F0FF', '#A78BFA', '#FBBF24', '#34D399', '#FB7185', '#818CF8'];

export default function ArcadeCanvas({ mode = 'starfield', spoons = 3 }: ArcadeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Array<{ x: number; y: number; z: number; size: number; brightness: number; color: string; vx: number; vy: number }> = [];
    let animId = 0;
    const speed = spoons >= 3 ? 1 : spoons / 3;

    const init = () => {
      const count = mode === 'starfield' ? 150 : mode === 'nebula' ? 120 : 50;
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        z: Math.random() * 100,
        size: 0.5 + Math.random() * 2,
        brightness: 0.3 + Math.random() * 0.7,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
      }));
    };

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = rect.width * dpr;
        canvas.height = Math.max(300, rect.height) * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    const animate = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.fillStyle = 'oklch(10% 0.01 240)';
      ctx.fillRect(0, 0, w, h);

      if (mode === 'starfield') {
        particles.forEach((p) => {
          p.z -= speed * 0.5;
          if (p.z <= 0) { p.x = Math.random() * 100; p.y = Math.random() * 100; p.z = 100; }
          const sx = (p.x - 50) * (100 / p.z) * (w / 100) + w / 2;
          const sy = (p.y - 50) * (100 / p.z) * (h / 100) + h / 2;
          const size = p.size * (100 / p.z) * 0.5;
          const alpha = p.brightness * (p.z / 100);
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(0.5, size), 0, Math.PI * 2);
          ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
          ctx.fill();
        });
      } else if (mode === 'nebula') {
        particles.forEach((p) => {
          p.x += p.vx * speed;
          p.y += p.vy * speed;
          if (p.x < 0 || p.x > 100) p.vx *= -1;
          if (p.y < 0 || p.y > 100) p.vy *= -1;
          const sx = (p.x / 100) * w;
          const sy = (p.y / 100) * h;
          const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, p.size * 8);
          grad.addColorStop(0, p.color + '30');
          grad.addColorStop(1, p.color + '00');
          ctx.fillStyle = grad;
          ctx.fillRect(sx - p.size * 8, sy - p.size * 8, p.size * 16, p.size * 16);
        });
      } else if (mode === 'matrix') {
        const time = Date.now() * 0.001;
        particles.forEach((p) => {
          const x = (p.x / 100) * w;
          const y = ((p.y + time * 20 * speed) % 110 - 5) / 100 * h;
          const char = String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96));
          ctx.font = `${Math.max(8, p.size * 4)}px monospace`;
          ctx.fillStyle = p.color + Math.floor(p.brightness * 180).toString(16).padStart(2, '0');
          ctx.fillText(char, x, y);
        });
      }

      animId = requestAnimationFrame(animate);
    };

    resize();
    init();
    animate();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, [mode, spoons]);

  return (
    <div style={{ width: '100%', minHeight: '300px', borderRadius: 'var(--p31-radius-md)', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}
