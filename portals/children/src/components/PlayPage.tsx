import GameCard from './GameCard';
import FocusTimer from './FocusTimer';
import BreathGuide from './BreathGuide';
import ArcadeHub from './ArcadeHub';
import { GAMES } from '../lib/constants';

interface PlayPageProps {
  active: boolean;
  gamesCompleted: number;
  starCount: number;
  spoons: number;
  role?: 'child' | 'teen' | 'parent';
  onPlayGame: (gameKey: string) => void;
  onLoveEarned?: (amount: number, reason: string) => void;
}

export default function PlayPage({ active, gamesCompleted, starCount, spoons, role, onPlayGame, onLoveEarned }: PlayPageProps) {
  return (
    <section className={`page${active ? ' active' : ''}`} id="page-play" role="tabpanel">
      <h2>🎮 Play</h2>
      <p className="subtitle">Games that grow with you</p>

      <div style={{ marginBottom: 'var(--p31-space-lg)' }}>
        <ArcadeHub spoons={spoons} onLoveEarned={onLoveEarned} role={role} />
      </div>

      <h3 style={{ fontSize: 'var(--p31-type-h2)', marginBottom: 'var(--p31-space-sm)' }}>🎓 Learn Games</h3>
      <div className="grid-2">
        {GAMES.map((game) => {
          const canPlay = spoons >= game.spoons;
          return (
            <GameCard
              key={game.key}
              icon={game.icon}
              title={game.title}
              desc={game.desc}
              onClick={() => onPlayGame(game.key)}
              disabled={!canPlay}
            />
          );
        })}
      </div>

      <div className="grid-2" style={{ marginTop: 'var(--p31-space-lg)' }}>
        <FocusTimer />
        <BreathGuide />
      </div>

      <div style={{ marginTop: 'var(--p31-space-lg)' }}>
        <div className="companion-card" style={{ background: 'rgba(80,140,200,0.08)', borderColor: 'var(--p31-accent-alt)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-md)' }}>
            <span style={{ fontSize: 'var(--p31-scale-3xl)' }}>🏆</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--p31-type-h3)' }}>Your Achievements</div>
              <div style={{ fontSize: 'var(--p31-type-body)', color: 'var(--p31-text-secondary)' }}>
                {gamesCompleted} games completed • {starCount} stars earned
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
