import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * @p31ca/design-core — shell/ambient.tsx
 *
 * The console's self-contained ambient: a geodesic wireframe sphere over a
 * twinkling starfield (pure canvas, no three.js — the prototype's proven
 * surface, canonized) plus a persisted LED mode chip. The console renders
 * these by default so it is fully self-contained; a portal may override the
 * ambient slot with the heavier three.js dome.
 *
 * Reduced-motion: a single static frame (no rAF loop).
 * Tab-hidden: the rAF loop pauses (no background burn).
 */

export interface LedChipState {
  mode: number;
  cycle: () => void;
}
export const useLedChipStore = create<LedChipState>()(
  persist((set) => ({
    mode: 0,
    cycle: () => set((s) => ({ mode: (s.mode + 1) % LED_MODES.length })),
  }), { name: 'p31-shell-led' }),
);

export const LED_MODES = ['RAINBOW', 'BREATH', 'SOLID', 'CHASE', 'OFF'] as const;

/** The LED mode chip — a persisted, decorative status chip (bottom-right). */
export function LedChip() {
  const mode = useLedChipStore((s) => s.mode);
  const cycle = useLedChipStore((s) => s.cycle);
  return (
    <button type="button" className="led-chip" aria-label={`LED mode: ${LED_MODES[mode]}`} onClick={cycle}>
      <span className="led-chip__dot" aria-hidden="true" />
      <span className="led-chip__label">LED {LED_MODES[mode]}</span>
    </button>
  );
}

/** The geodesic ambient — wireframe icosahedron + stars, theme-colored. */
export function ShellAmbient({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0;
    let starField: { x: number; y: number; r: number; ph: number }[] = [];
    let raf = 0;
    let lastTheme = '';

    // Icosahedron wireframe (the prototype's geodesic surface).
    const t = (1 + Math.sqrt(5)) / 2;
    const verts: [number, number, number][] = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
    ];
    const faces: [number, number, number][] = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
    ];

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      starField = [];
      for (let i = 0; i < 90; i++) {
        starField.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.1 + 0.2, ph: Math.random() * 6.28 });
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const colors = (): { star: string; line: string } => {
      const cs = getComputedStyle(document.documentElement);
      return {
        star: cs.getPropertyValue('--p31-star-cool').trim() || 'oklch(58.9% 0.033 70)',
        line: cs.getPropertyValue('--p31-accent').trim() || 'oklch(78% 0.14 210)',
      };
    };

    const draw = (now: number) => {
      const th = document.documentElement.dataset.theme ?? '';
      if (th !== lastTheme) lastTheme = th;
      const c = colors();
      ctx.clearRect(0, 0, W, H);
      starField.forEach((s) => {
        ctx.fillStyle = c.star;
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(s.ph + now * 0.0006);
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.28); ctx.fill();
      });
      ctx.globalAlpha = 1;
      const cx = W * 0.82, cy = H * 0.4, scale = Math.min(W, H) * 0.22;
      const rotX = now * 0.00016, rotY = now * 0.00011;
      const pts = verts.map((v) => {
        let x = v[0] * Math.cos(rotY) - v[2] * Math.sin(rotY);
        let z = v[0] * Math.sin(rotY) + v[2] * Math.cos(rotY);
        let y = v[1] * Math.cos(rotX) - z * Math.sin(rotX);
        z = v[1] * Math.sin(rotX) + z * Math.cos(rotX);
        return { x: cx + x * scale, y: cy + y * scale, z };
      });
      ctx.strokeStyle = c.line; ctx.globalAlpha = 0.14;
      faces.forEach((f) => {
        for (let i = 0; i < 3; i++) {
          const a = pts[f[i] ?? 0], b = pts[f[(i + 1) % 3] ?? 0];
          if (!a || !b) continue;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;
    };

    if (reduced) {
      draw(200000);
    } else {
      const loop = () => {
        if (!document.hidden) draw(performance.now());
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [reduced]);

  // Theme colors are read live in draw() from the document's current tokens,
  // so a theme switch re-colors the ambient on the next frame automatically.
  return (
    <div className={`shell-ambient ${className}`.trim()} aria-hidden="true">
      <canvas ref={canvasRef} className="shell-ambient__canvas" />
    </div>
  );
}