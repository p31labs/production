import { useEffect, useState } from 'react';

const CONFETTI_COUNT = 36;
const PIECE_PALETTES = [
  'var(--p31-accent)',
  'var(--p31-star)',
  'var(--p31-accent-violet)',
  'var(--p31-accent-green)',
] as const;

export function Confetti({ fireKey, durationMs = 2600 }: { fireKey: number; durationMs?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!fireKey) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), durationMs);
    return () => window.clearTimeout(timer);
  }, [fireKey, durationMs]);

  if (!visible) return null;

  const pieces = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    left: `${(i * 27 + 11) % 100}%`,
    delay: `${(i * 137) % 500}ms`,
    duration: `${900 + ((i * 211) % 900)}ms`,
    color: PIECE_PALETTES[i % PIECE_PALETTES.length],
  }));

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((piece, i) => (
        <span
          key={`${fireKey}-${i}`}
          className="confetti__piece"
          style={{
            left: piece.left,
            background: piece.color,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
          }}
        />
      ))}
    </div>
  );
}