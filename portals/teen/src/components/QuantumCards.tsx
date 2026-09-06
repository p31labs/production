import { useState, useEffect, useCallback } from 'react';
import { useArcadeStore } from '../store/useArcadeStore';
import { useArcadeEffects } from '../hooks/useArcadeEffects';

interface Card {
  id: string;
  symbol: string;
  label: string;
  pairId: string;
}

interface QuantumCardsProps {
  spoons?: number;
  onLoveEarned?: (amount: number, reason: string) => void;
}

const PAIRS: { symbol: string; label: string }[] = [
  { symbol: '↑', label: 'Spin Up' },
  { symbol: '↓', label: 'Spin Down' },
  { symbol: '🔗', label: 'Entangled' },
  { symbol: '⚡', label: 'Superposition' },
  { symbol: '💥', label: 'Collapse' },
  { symbol: '🌀', label: 'Vortex' },
  { symbol: '💎', label: 'Qubit' },
  { symbol: '✨', label: 'Coherence' },
  { symbol: '🔔', label: 'Bell State' },
  { symbol: '🌫️', label: 'Decoherence' },
  { symbol: '📐', label: 'Measure' },
  { symbol: '🖤', label: 'Black Hole' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuantumCards({ spoons = 3, onLoveEarned }: QuantumCardsProps) {
  const { cards, completeGame } = useArcadeStore();
  const effects = useArcadeEffects(spoons);
  const [deck, setDeck] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);

  const deckSize = Math.min(6 + Math.floor(cards.decksUnlocked), 12);

  useEffect(() => {
    const selected = PAIRS.slice(0, deckSize);
    const pairs = selected.flatMap((p) => [
      { ...p, id: `${p.label}-a`, pairId: p.label },
      { ...p, id: `${p.label}-b`, pairId: p.label },
    ]);
    setDeck(shuffle(pairs));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
  }, [deckSize, cards.decksUnlocked]);

  const handleClick = useCallback(
    (index: number) => {
      if (flipped.length === 2) return;
      if (flipped.includes(index) || matched.has(deck[index].pairId)) return;

      const next = [...flipped, index];
      setFlipped(next);

      if (next.length === 2) {
        const [a, b] = next;
        if (deck[a].pairId === deck[b].pairId) {
          const pairId = deck[a].pairId;
          effects.match();
          setTimeout(() => {
            setMatched((prev) => {
              const merged = new Set(prev);
              merged.add(pairId);
              return merged;
            });
            setFlipped([]);
          }, 400);
        } else {
          effects.reject();
          setTimeout(() => setFlipped([]), 800);
        }
        setMoves((m) => m + 1);
      }
    },
    [flipped, matched, deck, effects],
  );

  const pairsMatched = matched.size;

  useEffect(() => {
    if (pairsMatched > 0 && pairsMatched % 4 === 0) {
      effects.love(2);
      onLoveEarned?.(2, 'Quantum Cards pair streak');
    }
  }, [pairsMatched, onLoveEarned, effects]);

  const isComplete = pairsMatched >= deckSize;

  useEffect(() => {
    if (isComplete) {
      effects.complete();
    }
  }, [isComplete, effects]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--p31-type-caption)', color: 'var(--p31-text-secondary)', fontFamily: 'var(--p31-font-mono, monospace)' }}>
        <span>🃏 Pairs: {pairsMatched}/{deckSize}</span>
        <span>Moves: {moves}</span>
        <span style={{ color: 'var(--p31-accent-gold, #FBBF24)' }}>Deck {cards.decksUnlocked}</span>
      </div>

      {isComplete && (
        <div style={{
          padding: '8px 16px',
          borderRadius: 8,
          background: 'rgba(52,211,153,0.1)',
          border: '1px solid rgba(52,211,153,0.3)',
          color: '#34D399',
          fontSize: 13,
          fontWeight: 600,
          textAlign: 'center',
        }}>
          🎉 Deck complete! +1 deck unlocked. +3 LOVE
          <button
            className="button green"
            style={{ marginLeft: 'var(--p31-space-sm)', minHeight: '32px', fontSize: 'var(--p31-type-caption)' }}
            onClick={() => {
              completeGame('cards', moves);
              onLoveEarned?.(3, 'Quantum Cards deck complete');
            }}
          >
            Claim &amp; Next
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))', gap: 'var(--p31-space-xs)' }}>
        {deck.map((card, i) => {
          const isFlipped = flipped.includes(i) || matched.has(card.pairId);
          return (
            <button
              key={card.id}
              onClick={() => handleClick(i)}
              style={{
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isFlipped ? 'var(--p31-glass-bg, rgba(255,255,255,0.06))' : 'rgba(255,255,255,0.1)',
                border: `1px solid ${isFlipped ? 'var(--p31-accent, #00F0FF)' : 'var(--p31-glass-border, rgba(255,255,255,0.12))'}`,
                borderRadius: 'var(--p31-radius-md, 8px)',
                fontSize: 'var(--p31-type-h2, 18px)',
                cursor: matched.has(card.pairId) ? 'default' : 'pointer',
                transition: 'all var(--p31-duration-fast, 0.15s) var(--p31-easing-smooth, ease-out)',
                minHeight: '48px',
                minWidth: '48px',
                opacity: matched.has(card.pairId) ? 0.45 : 1,
                color: 'var(--p31-text-primary, #f0f2f5)',
              }}
              aria-label={isFlipped ? card.label : 'Face-down card'}
            >
              {isFlipped ? card.symbol : '❓'}
            </button>
          );
        })}
      </div>
      <p style={{ color: 'var(--p31-text-muted, rgba(245,245,247,0.3))', fontSize: 11, margin: 0, textAlign: 'center' }}>
        Match entangled pairs. Every 4 pairs collapse into +2 LOVE. Spoons gate the deck size.
      </p>
    </div>
  );
}
