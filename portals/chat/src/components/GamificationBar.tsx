import { useGamification } from '../store/gamification';
import { useSpoons } from '../store/spoons';

export function GamificationBar() {
  const spoons = useSpoons((s) => s.spoons);
  const maxSpoons = useSpoons((s) => s.maxSpoons);
  const xp = useGamification((s) => s.xp);
  const xpNext = useGamification((s) => s.xpNext);
  const level = useGamification((s) => s.level);
  const love = useGamification((s) => s.love);
  const quest = useGamification((s) => s.quest);
  const questGoal = useGamification((s) => s.questGoal);
  const streak = useGamification((s) => s.streak);

  return (
    <aside className="gamification-bar" aria-label="Session status">
      <div className="gamification-bar__item">
        <span className="gamification-bar__label">Spoons</span>
        <span className="gamification-bar__value gamification-bar__value--spoons">
          {'●'.repeat(spoons)}{'○'.repeat(Math.max(maxSpoons - spoons, 0))}
        </span>
      </div>
      <div className="gamification-bar__item">
        <span className="gamification-bar__label">XP</span>
        <span className="gamification-bar__value">{xp}/{xpNext}</span>
      </div>
      <div className="gamification-bar__item">
        <span className="gamification-bar__label">Level</span>
        <span className="gamification-bar__value">{level}</span>
      </div>
      <div className="gamification-bar__item">
        <span className="gamification-bar__label">LOVE</span>
        <span className="gamification-bar__value">{love}</span>
      </div>
      <div className="gamification-bar__item">
        <span className="gamification-bar__label">Quest</span>
        <span className="gamification-bar__value">{quest}/{questGoal}</span>
      </div>
      <div className="gamification-bar__item">
        <span className="gamification-bar__label">Streak</span>
        <span className="gamification-bar__value">{streak}d</span>
      </div>
    </aside>
  );
}
