import { useEffect, useRef } from 'react';
import { useSpoonsStore } from '../lib/useSpoonsStore';

interface Star {
  x: number;
  y: number;
  r: number;
  tw: number;
  ts: number;
}

function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function genStars(count: number, seed: number): Star[] {
  const rand = prng(seed);
  const stars: Star[] = [];
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: rand(),
      y: rand(),
      r: 0.4 + rand() * 1.1,
      tw: rand() * Math.PI * 2,
      ts: 0.2 + rand() * 0.9,
    });
  }
  return stars;
}

const STARS = 140;
const SEED = 182332;

/**
 * AmbientStarfield — seeded canvas behind every surface.
 * Reads `--p31-star` per frame (theme-driven). At spoons 0 / reduced motion it
 * renders a single static frame and stops the rAF loop (battery/CPU safe).
 */
export function AmbientStarfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const calm = useSpoonsStore((s) => s.spoons === 0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reduce = calm || prefersReduced;

    let stars: Star[] = genStars(STARS, SEED);
    let raf = 0;

    const starColor = () =>
      getComputedStyle(document.documentElement).getPropertyValue('--p31-star').trim() ||
      'oklch(80% 0.125 90)';

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stars = genStars(STARS, SEED);
    };

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = starColor();
      const now = Date.now();
      for (const s of stars) {
        const twinkle = 0.35 + 0.3 * Math.sin(s.tw + now * 0.001 * s.ts);
        ctx.globalAlpha = Math.min(1, twinkle);
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const frame = () => {
      draw();
      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener('resize', resize);

    if (reduce) {
      draw();
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [calm]);

  return <canvas className="starfield" ref={canvasRef} aria-hidden="true" />;
}

export default AmbientStarfield;