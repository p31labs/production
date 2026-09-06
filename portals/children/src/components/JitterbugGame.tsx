import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createJitterbug,
  tickJitterbug,
  setJitterbugTarget,
  jitterbugVertices,
  jitterbugEdges,
} from '@p31/game-engine';
import type { JitterbugState } from '@p31/game-engine';
import { useArcadeStore } from '../store/useArcadeStore';
import { useArcadeEffects } from '../hooks/useArcadeEffects';

interface JitterbugGameProps {
  spoons?: number;
  onLoveEarned?: (amount: number, reason: string) => void;
}

const TARGETS: { label: string; phase: number; love: number }[] = [
  { label: 'Cuboctahedron', phase: 0.0, love: 8 },
  { label: 'Icosahedron', phase: 0.5, love: 12 },
  { label: 'Octahedron', phase: 1.0, love: 16 },
];

function JitterbugCanvas({ spoons, targetPhase, onMatch }: { spoons: number; targetPhase: number; onMatch: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<JitterbugState>(createJitterbug({ spoons, phase: 0 }));
  const targetRef = useRef(targetPhase);
  const matchedRef = useRef(false);

  useEffect(() => {
    targetRef.current = targetPhase;
    matchedRef.current = false;
  }, [targetPhase]);

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

    let then = performance.now();
    const animate = (now: number) => {
      const dt = Math.min((now - then) / 1000, 1 / 30);
      then = now;

      let s = stateRef.current;
      if (Math.abs(s.targetPhase - s.phase) < 0.005) {
        s = setJitterbugTarget(s, Math.abs(s.targetPhase) < 0.01 ? 1.0 : 0.0, spoons);
      }
      s = tickJitterbug(s, dt);
      stateRef.current = s;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(10,10,18,0.9)';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w / 2, h / 2);
      const scale = Math.min(w, h) * 0.32;
      ctx.scale(scale, scale);

      const verts = jitterbugVertices(s.phase);
      const edges = jitterbugEdges(s.phase);

      ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
      ctx.lineWidth = 0.03;
      for (const [a, b] of edges) {
        ctx.beginPath();
        ctx.moveTo(verts[a].x, verts[a].y);
        ctx.lineTo(verts[b].x, verts[b].y);
        ctx.stroke();
      }

      const gated = Math.max(3, Math.floor(4 + spoons * 1.6));
      for (let i = 0; i < verts.length; i++) {
        const v = verts[i];
        ctx.beginPath();
        ctx.arc(v.x, v.y, i < gated ? 0.05 : 0.025, 0, Math.PI * 2);
        ctx.fillStyle = i < gated ? 'rgba(167, 139, 250, 0.8)' : 'rgba(167, 139, 250, 0.2)';
        ctx.fill();
      }

      const targetVerts = jitterbugVertices(targetRef.current);
      ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
      for (const v of targetVerts) {
        ctx.beginPath();
        ctx.arc(v.x, v.y, 0.06, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      if (!matchedRef.current && Math.abs(s.phase - targetRef.current) < 0.03) {
        matchedRef.current = true;
        onMatch();
      }

      requestAnimationFrame(animate);
    };

    const raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [spoons, onMatch]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: 'auto',
        display: 'block',
        aspectRatio: '4/3',
        borderRadius: 'var(--p31-radius-md)',
        background: 'rgba(5,5,8,0.9)',
        border: '1px solid rgba(0,240,255,0.1)',
      }}
    />
  );
}

export default function JitterbugGame({ spoons = 3, onLoveEarned }: JitterbugGameProps) {
  const { jitterbug, completeGame } = useArcadeStore();
  const effects = useArcadeEffects(spoons);
  const [targetIdx, setTargetIdx] = useState(0);
  const [message, setMessage] = useState('');
  const [sessionLove, setSessionLove] = useState(0);
  const [matches, setMatches] = useState(0);
  const msgT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const target = TARGETS[targetIdx % TARGETS.length];

  const handleMatch = useCallback(() => {
    setMatches((m) => m + 1);
    setSessionLove((l) => l + target.love);
    setMessage(`✨ Matched! +${target.love} LOVE`);
    effects.love(target.love);
    effects.celebrate(40);

    if (msgT.current) clearTimeout(msgT.current);
    msgT.current = setTimeout(() => setMessage(''), 2000);

    const score = jitterbug.highScore + 10;
    completeGame('jitterbug', score);
    onLoveEarned?.(target.love, `Jitterbug: ${target.label}`);

    setTargetIdx((i) => i + 1);
  }, [target.love, target.label, jitterbug.highScore, completeGame, onLoveEarned, effects]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--p31-type-caption)', color: 'var(--p31-text-secondary)', fontFamily: 'var(--p31-font-mono, monospace)' }}>
        <span style={{ color: 'var(--p31-accent-gold, #FBBF24)' }}>🎯 {target.label}</span>
        <span>Level {jitterbug.level}</span>
        <span>✨ {matches}</span>
        <span style={{ color: 'var(--p31-accent-green, #34D399)' }}>❤️ +{sessionLove}</span>
      </div>

      {message && (
        <div style={{
          padding: '6px 16px',
          borderRadius: 8,
          background: 'rgba(52,211,153,0.1)',
          border: '1px solid rgba(52,211,153,0.3)',
          color: '#34D399',
          fontSize: 13,
          fontWeight: 600,
          textAlign: 'center',
        }}>
          {message}
        </div>
      )}

      <JitterbugCanvas spoons={spoons} targetPhase={target.phase} onMatch={handleMatch} />

      <p style={{ color: 'var(--p31-text-muted, rgba(245,245,247,0.3))', fontSize: 11, margin: 0, textAlign: 'center' }}>
        Gold dots show the target shape. Watch as the geometry morphs — match it to earn LOVE.
      </p>
    </div>
  );
}
