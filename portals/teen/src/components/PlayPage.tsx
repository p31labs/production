import ArcadeHub from './ArcadeHub';

interface PlayPageProps {
  active: boolean;
  spoons: number;
  role?: 'child' | 'teen' | 'parent';
  onLoveEarned?: (amount: number, reason: string) => void;
}

const GAMES = [
  { icon: '🧬', name: 'BONDING', desc: 'Build molecules', spoons: 2, love: 10 },
  { icon: '🎯', name: 'Pattern Match', desc: 'Find the sequence', spoons: 2, love: 15 },
  { icon: '🔗', name: 'Chain Reaction', desc: 'Link atoms', spoons: 3, love: 20 },
];

export default function PlayPage({ active, spoons, role, onLoveEarned }: PlayPageProps) {
  return (
    <section className={`page${active ? ' active' : ''}`} id="page-play" role="tabpanel">
      <h2>🎮 ARCADE</h2>
      <ArcadeHub spoons={spoons} onLoveEarned={onLoveEarned} role={role} />
      <h3 style={{ fontSize: 'var(--p31-type-h2)', margin: 'var(--p31-space-lg) 0 var(--p31-space-sm)' }}>🧬 LEARN GAMES</h3>
      <div id="gamesGrid" className="grid-4">
        {GAMES.map((game) => (
          <div key={game.name} className="game-card">
            <div className="game-icon">{game.icon}</div>
            <div className="game-title">{game.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--p31-text-secondary)' }}>{game.desc}</div>
            <div style={{ fontSize: '10px', color: 'var(--p31-text-muted)' }}>🥄 {game.spoons} · 💎 {game.love}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
