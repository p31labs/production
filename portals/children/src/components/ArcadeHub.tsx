import { useState } from 'react';
import { useArcadeStore } from '../store/useArcadeStore';
import { useArcadeEffects } from '../hooks/useArcadeEffects';
import JitterbugGame from './JitterbugGame';
import LiquidSculptor from './LiquidSculptor';
import QuantumCards from './QuantumCards';
import StrategyBoard from './StrategyBoard';

interface ArcadeHubProps {
  spoons: number;
  onLoveEarned?: (amount: number, reason: string) => void;
  role?: 'child' | 'teen' | 'parent';
}

const GAMES: { id: string; icon: string; label: string; desc: string; color: string }[] = [
  { id: 'jitterbug', icon: '🌀', label: 'Jitterbug', desc: 'Quantum geometry morphing', color: 'var(--p31-accent, #00F0FF)' },
  { id: 'liquid', icon: '🌊', label: 'Liquid Sculptor', desc: 'Wavefunction particle painting', color: 'var(--p31-accent-alt, #7DD3FC)' },
  { id: 'cards', icon: '🃏', label: 'Quantum Cards', desc: 'Entanglement memory matching', color: 'var(--p31-accent-gold, #FBBF24)' },
  { id: 'strategy', icon: '♟️', label: 'Strategy Board', desc: 'SIC-POVM measurement grid', color: 'var(--p31-accent-violet, #A78BFA)' },
];

const UNLOCK_AT: Record<string, number> = { jitterbug: 0, liquid: 10, cards: 25, strategy: 50 };

const ROLE_AGE: Record<string, number> = { child: 8, teen: 15, parent: 35 };

export default function ArcadeHub({ spoons, onLoveEarned, role = 'child' }: ArcadeHubProps) {
  const [active, setActive] = useState<string | null>(null);
  const { loveBalance, totalEarned, unlockedGames, jitterbug, liquid, cards, strategy } = useArcadeStore();
  const effects = useArcadeEffects(spoons);
  const tier = effects.growthTier(ROLE_AGE[role] ?? 8);

  const progress: Record<string, string> = {
    jitterbug: `Level ${jitterbug.level} · ⭐ ${jitterbug.highScore}`,
    liquid: `⭐ ${liquid.highScore} · ✨ ${liquid.patternsFound}`,
    cards: `Pairs ${cards.pairsMatched} · Deck ${cards.decksUnlocked}`,
    strategy: `🏆 ${strategy.wins} wins`,
  };

  const renderGame = (id: string) => {
    switch (id) {
      case 'jitterbug':
        return <JitterbugGame spoons={spoons} onLoveEarned={onLoveEarned} />;
      case 'liquid':
        return <LiquidSculptor spoons={spoons} onLoveEarned={onLoveEarned} />;
      case 'cards':
        return <QuantumCards spoons={spoons} onLoveEarned={onLoveEarned} />;
      case 'strategy':
        return <StrategyBoard spoons={spoons} onLoveEarned={onLoveEarned} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-md)' }}>
      <div className="companion-card" style={{ background: 'rgba(0,240,255,0.06)', borderColor: 'rgba(0,240,255,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--p31-space-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-md)' }}>
            <span style={{ fontSize: 'var(--p31-scale-3xl)' }}>🎮</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--p31-type-h3)' }}>
                Quantum Arcade
                <span style={{ marginLeft: 'var(--p31-space-sm)', fontSize: 'var(--p31-type-caption)', color: 'var(--p31-accent-violet, #A78BFA)' }}>
                  {effects.tierIcon(tier)} {effects.tierLabel(tier)}
                </span>
              </div>
              <div style={{ fontSize: 'var(--p31-type-caption)', color: 'var(--p31-text-secondary)' }}>
                Earn LOVE. Unlock dimensions. Collapse the wavefunction.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--p31-space-lg)', fontSize: 'var(--p31-type-caption)', fontFamily: 'var(--p31-font-mono, monospace)' }}>
            <span style={{ color: 'var(--p31-accent-green, #34D399)' }}>❤️ {loveBalance} LOVE</span>
            <span style={{ color: 'var(--p31-text-secondary)' }}>🏆 {totalEarned} total</span>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {GAMES.map((g) => {
          const unlocked = unlockedGames.includes(g.id) || UNLOCK_AT[g.id] === 0;
          const at = UNLOCK_AT[g.id];
          const selected = active === g.id;
          return (
            <div
              key={g.id}
              onClick={() => unlocked && setActive(selected ? null : g.id)}
              role="button"
              aria-pressed={selected}
              style={{
                cursor: unlocked ? 'pointer' : 'not-allowed',
                opacity: unlocked ? 1 : 0.55,
                textAlign: 'center',
                padding: 'var(--p31-space-md)',
                background: selected ? `${g.color}14` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selected ? g.color : 'var(--p31-glass-border, rgba(255,255,255,0.1))'}`,
                borderRadius: 'var(--p31-radius-md, 10px)',
                transition: 'all 0.2s ease-out',
                boxShadow: selected ? `0 0 24px ${g.color}33` : undefined,
              }}
            >
              <div style={{ fontSize: 'var(--p31-scale-3xl)', marginBottom: 'var(--p31-space-xs)' }}>
                {unlocked ? g.icon : '🔒'}
              </div>
              <div style={{ fontWeight: 600, fontSize: 'var(--p31-type-h3)' }}>{g.label}</div>
              <div style={{ fontSize: 'var(--p31-type-caption, 11px)', color: 'var(--p31-text-secondary)', marginTop: 2 }}>{g.desc}</div>
              <div style={{ fontSize: 'var(--p31-type-caption, 11px)', color: g.color, marginTop: 'var(--p31-space-xs)' }}>
                {unlocked ? progress[g.id] : `🔒 Unlocks at ${at} LOVE`}
              </div>
            </div>
          );
        })}
      </div>

      {active && (
        <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--p31-space-sm)' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--p31-type-h2)' }}>
              {GAMES.find((g) => g.id === active)?.icon} {GAMES.find((g) => g.id === active)?.label}
            </h3>
            <button
              className="button secondary"
              style={{ padding: '4px 12px', minHeight: '30px', fontSize: 'var(--p31-type-caption, 11px)' }}
              onClick={() => setActive(null)}
            >
              ✕ Close
            </button>
          </div>
          {renderGame(active)}
        </div>
      )}
    </div>
  );
}
