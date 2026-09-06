import { useEffect, useRef, useState, useCallback } from 'react';
import { useArcadeStore } from '../store/useArcadeStore';
import { useArcadeEffects } from '../hooks/useArcadeEffects';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  hue: number;
}

interface LiquidSculptorProps {
  spoons?: number;
  onLoveEarned?: (amount: number, reason: string) => void;
}

export default function LiquidSculptor({ spoons = 3, onLoveEarned }: LiquidSculptorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { liquid, completeGame } = useArcadeStore();
  const effects = useArcadeEffects(spoons);
  const effectsRef = useRef(effects);
  effectsRef.current = effects;
  const [score, setScore] = useState(0);
  const [painting, setPainting] = useState(false);
  const [patterns, setPatterns] = useState(0);

  const scoreRef = useRef(0);
  const animRef = useRef<number | null>(null);

  const handleLove = useCallback(
    (amount: number, reason: string) => onLoveEarned?.(amount, reason),
    [onLoveEarned],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.parentElement?.getBoundingClientRect() || { width: 340, height: 260 };
    const w = rect.width || 340;
    const h = rect.height || 260;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let particles: Particle[] = [];
    let paintingLocal = false;
    const countPerSpawn = Math.max(2, Math.floor(2 + spoons * 1.2));

    const spawn = (x: number, y: number) => {
      for (let i = 0; i < countPerSpawn; i++) {
        particles.push({
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          size: 2 + Math.random() * 4,
          life: 1,
          hue: Math.random() > 0.5 ? 200 : 280,
        });
      }
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!paintingLocal) return;
      const r = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const x = (clientX - r.left) * (w / r.width);
      const y = (clientY - r.top) * (h / r.height);
      spawn(x, y);
    };

    const start = () => { paintingLocal = true; setPainting(true); };
    const end = () => {
      paintingLocal = false;
      setPainting(false);
      if (scoreRef.current > liquid.highScore) {
        completeGame('liquid', scoreRef.current);
      }
    };

    const animate = () => {
      ctx.fillStyle = 'rgba(10,10,18,0.18)';
      ctx.fillRect(0, 0, w, h);

      particles = particles
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vx: p.vx + (Math.random() - 0.5) * 0.12,
          vy: p.vy + (Math.random() - 0.5) * 0.12,
          life: p.life - 0.004,
          size: p.size * 0.998,
        }))
        .filter((p) => p.life > 0 && p.size > 0.5);

      for (const p of particles) {
        const alpha = p.life * 0.7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${alpha})`;
        ctx.fill();

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        grad.addColorStop(0, `hsla(${p.hue}, 80%, 60%, ${alpha * 0.15})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      if (particles.length > 0 && particles.length % 30 === 0) {
        scoreRef.current += 1;
        setScore(scoreRef.current);
        if (scoreRef.current % 12 === 0) {
          setPatterns((p) => p + 1);
          effectsRef.current.love(3);
          effectsRef.current.celebrate(30);
          handleLove(3, 'Liquid Sculptor pattern discovered');
        }
      }

      animRef.current = requestAnimationFrame(animate);
    };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchend', end, { passive: false });

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mouseup', end);
      canvas.removeEventListener('mouseleave', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchend', end);
    };
  }, [spoons, liquid.highScore, completeGame, handleLove]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--p31-type-caption)', color: 'var(--p31-text-secondary)', fontFamily: 'var(--p31-font-mono, monospace)' }}>
        <span>🎨 {painting ? 'Sculpting…' : 'Paint to sculpt'}</span>
        <span>✨ {patterns}</span>
        <span style={{ color: 'var(--p31-accent, #00F0FF)' }}>⭐ {score}</span>
      </div>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          aspectRatio: '4/3',
          borderRadius: 'var(--p31-radius-md)',
          cursor: 'crosshair',
          background: 'rgba(5,5,8,0.9)',
          border: '1px solid rgba(0,240,255,0.1)',
          touchAction: 'none',
        }}
      />
      <p style={{ color: 'var(--p31-text-muted, rgba(245,245,247,0.3))', fontSize: 11, margin: 0, textAlign: 'center' }}>
        Every 12 patterns collapse the wavefunction into +3 LOVE.
      </p>
    </div>
  );
}
