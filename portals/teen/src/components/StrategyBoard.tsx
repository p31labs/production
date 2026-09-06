import { useState, useEffect, useCallback, useRef } from 'react';
import { useArcadeStore } from '../store/useArcadeStore';
import { useArcadeEffects } from '../hooks/useArcadeEffects';

interface StrategyBoardProps {
  spoons?: number;
  onLoveEarned?: (amount: number, reason: string) => void;
}

interface Cell {
  value: number;
  state: 'hidden' | 'measured' | 'collapsed';
}

interface Mission {
  label: string;
  target: number;
}

const MISSIONS: Mission[] = [
  { label: 'Find 3 aligned qubits', target: 3 },
  { label: 'Collapse 4 energy states', target: 4 },
  { label: 'Measure a 5-node chain', target: 5 },
  { label: 'Decode the lattice', target: 6 },
  { label: 'Collapse the superposition', target: 7 },
];

function buildGrid(size: number): Cell[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({
      value: Math.floor(Math.random() * 4) + 1,
      state: 'hidden' as const,
    })),
  );
}

export default function StrategyBoard({ spoons = 3, onLoveEarned }: StrategyBoardProps) {
  const { strategy, completeGame } = useArcadeStore();
  const effects = useArcadeEffects(spoons);
  const [grid, setGrid] = useState<Cell[][]>(() => buildGrid(5));
  const [missionIdx, setMissionIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState('');
  const msgT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const mission = MISSIONS[missionIdx % MISSIONS.length];
  const size = 4 + Math.floor(strategy.missionsCompleted / 2);
  const threshold = Math.max(2, 2 + Math.floor(spoons / 2));

  useEffect(() => {
    setGrid(buildGrid(size));
  }, [size, missionIdx]);

  useEffect(() => {
    return () => {
      if (msgT.current) clearTimeout(msgT.current);
    };
  }, []);

  const handleCellClick = useCallback(
    (y: number, x: number) => {
      if (grid[y][x].state !== 'hidden') return;

      const copy = grid.map((row) => row.map((c) => ({ ...c })));
      const cell = copy[y][x];
      cell.state = 'measured';

      let run = 0;
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dy, dx] of dirs) {
        const ny = y + dy;
        const nx = x + dx;
        if (ny >= 0 && ny < size && nx >= 0 && nx < size && copy[ny][nx].value === cell.value) {
          run += 1;
        }
      }

      if (run >= threshold) {
        cell.state = 'collapsed';
        setScore((s) => s + 10);
        setMessage(`💥 Collapsed! +10`);
        effects.love(2);
        effects.match();
        onLoveEarned?.(2, 'StrategyBoard pattern collapsed');
      } else {
        setMessage('❌ Not aligned');
        effects.reject();
      }

      if (msgT.current) clearTimeout(msgT.current);
      msgT.current = setTimeout(() => setMessage(''), 1500);

      setGrid(copy);

      const collapsedCount = copy.flat().filter((c) => c.state === 'collapsed').length;
      if (collapsedCount >= mission.target) {
        effects.complete();
        completeGame('strategy', score + 10);
        setTimeout(() => setMissionIdx((i) => i + 1), 600);
      }
    },
    [grid, size, threshold, mission.target, score, completeGame, onLoveEarned, effects],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--p31-type-caption)', color: 'var(--p31-text-secondary)', fontFamily: 'var(--p31-font-mono, monospace)' }}>
        <span style={{ color: 'var(--p31-accent-violet, #A78BFA)' }}>🎯 {mission.label}</span>
        <span>Wins {strategy.wins}</span>
        <span style={{ color: 'var(--p31-accent-green, #34D399)' }}>⭐ {score}</span>
      </div>

      {message && (
        <div style={{
          padding: '6px 16px',
          borderRadius: 8,
          background: message.includes('❌') ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)',
          border: `1px solid ${message.includes('❌') ? 'rgba(248,113,113,0.3)' : 'rgba(52,211,153,0.3)'}`,
          color: message.includes('❌') ? '#F87171' : '#34D399',
          fontSize: 13,
          fontWeight: 600,
          textAlign: 'center',
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${size}, 1fr)`, gap: 'var(--p31-space-xs, 6px)', maxWidth: 360, margin: '0 auto', width: '100%' }}>
        {grid.flat().map((cell, i) => (
          <button
            key={i}
            onClick={() => handleCellClick(Math.floor(i / size), i % size)}
            style={{
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background:
                cell.state === 'collapsed' ? 'rgba(52,211,153,0.2)' :
                cell.state === 'measured' ? 'rgba(0,240,255,0.2)' :
                'rgba(255,255,255,0.05)',
              border: `1px solid ${
                cell.state === 'collapsed' ? 'rgba(52,211,153,0.6)' :
                cell.state === 'measured' ? 'rgba(0,240,255,0.5)' :
                'var(--p31-glass-border, rgba(255,255,255,0.1))'
              }`,
              borderRadius: 'var(--p31-radius-sm, 6px)',
              fontSize: 'var(--p31-type-caption, 12px)',
              fontFamily: 'var(--p31-font-mono, monospace)',
              cursor: cell.state === 'hidden' ? 'pointer' : 'default',
              transition: 'all 0.15s ease-out',
              minHeight: '40px',
              color: cell.state === 'collapsed' ? '#34D399' : cell.state === 'measured' ? '#00F0FF' : 'rgba(255,255,255,0.3)',
            }}
            aria-label={cell.state === 'hidden' ? 'Hidden cell' : `Value ${cell.value}`}
          >
            {cell.state === 'collapsed' ? '✨' : cell.state === 'measured' ? cell.value : '?'}
          </button>
        ))}
      </div>
      <p style={{ color: 'var(--p31-text-muted, rgba(245,245,247,0.3))', fontSize: 11, margin: 0, textAlign: 'center' }}>
        Tap cells to measure the lattice. Collapse {threshold}+ equal neighbors into energy. Each collapse = +2 LOVE.
      </p>
    </div>
  );
}
