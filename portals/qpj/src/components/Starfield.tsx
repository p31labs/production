import { useEffect, useRef } from 'react';
import { useQpjStore } from '../store/useQpjStore';
import { useNotifStore } from '../store/useNotifStore';
import { genStars, type Star } from '../lib/starfield';
import './starfield.css';

const STAR_COUNT = 140;
const SEED = 182332;
const FLARE_MS = 1400;
const FLARE_COUNT = 6;

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduceMotion = useQpjStore((s) => s.reduceMotion);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const calm = reduceMotion || prefersReduced;

    let stars: Star[] = genStars(STAR_COUNT, SEED);
    let flareAt = 0;
    let flareRef = 0;
    let flareStars: Star[] = [];

    const starColor = () => {
      const css = getComputedStyle(document.documentElement)
        .getPropertyValue('--p31-star')
        .trim();
      return css || 'oklch(80% 0.125 90)';
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stars = genStars(STAR_COUNT, SEED);
    };

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = starColor();
      const now = Date.now();
      const flareOn = now - flareAt < FLARE_MS;
      for (const s of stars) {
        const twinkle = 0.35 + 0.3 * Math.sin(s.tw + now * 0.001 * s.ts);
        const flaring = flareOn && flareStars.includes(s) ? 1 : 0;
        ctx.globalAlpha = Math.min(1, twinkle + flaring * 0.55);
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r * (flaring ? 1.6 : 1), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const frame = () => {
      draw();
      flareRef = requestAnimationFrame(frame);
    };

    const unsub = useNotifStore.subscribe((state, prev) => {
      if (state.items.length === prev.items.length) return;
      const evt = state.items[state.items.length - 1];
      if (evt?.burst) {
        flareAt = Date.now();
        flareStars = stars.slice().sort(() => Math.random() - 0.5).slice(0, FLARE_COUNT);
      }
    });

    resize();
    window.addEventListener('resize', resize);

    if (calm) {
      draw();
      const settle = window.setInterval(() => {
        if (Date.now() - flareAt < FLARE_MS && flareStars.length > 0) draw();
      }, 500);
      return () => {
        window.clearInterval(settle);
        window.removeEventListener('resize', resize);
        unsub();
      };
    }

    flareRef = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(flareRef);
      window.removeEventListener('resize', resize);
      unsub();
    };
  }, [reduceMotion]);

  return <canvas className="starfield" ref={canvasRef} aria-hidden="true" />;
}