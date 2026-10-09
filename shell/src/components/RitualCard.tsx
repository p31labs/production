import { useMemo } from 'react';
import { timeAgo } from '../lib/meatspace/game';

interface RitualCardProps {
  ritual: {
    id: string;
    text: string;
    icon: string;
    loveReward: number;
    dueAt: number;
    completed: boolean;
  };
  userAge?: number; // Age-adaptive: 7-10 (child), 11-17 (teen), 18+ (adult)
  onComplete: (id: string) => void;
}

export default function RitualCard({ ritual, userAge = 18, onComplete }: RitualCardProps) {
  const ageGroup = userAge < 11 ? 'child' : userAge < 18 ? 'teen' : 'adult';
  const overdue = ritual.dueAt < Date.now() && !ritual.completed;

  // Age-adaptive presentation
  const { displayText, displayReward, completeBtnText } = useMemo(() => {
    if (ageGroup === 'child') {
      // Simple, visual, emoji-heavy
      const stars = '⭐'.repeat(Math.min(4, ritual.loveReward));
      return {
        displayText: `${ritual.icon} ${ritual.text}!`,
        displayReward: `Earn ${stars}`,
        completeBtnText: '✓ Done!',
      };
    } else if (ageGroup === 'teen') {
      // Medium complexity, progress bars, social
      return {
        displayText: ritual.text,
        displayReward: `+${ritual.loveReward} LOVE`,
        completeBtnText: '✓ Complete',
      };
    } else {
      // Full complexity, LOVE economy, analytics
      return {
        displayText: ritual.text,
        displayReward: `+${ritual.loveReward} LOVE`,
        completeBtnText: 'Complete',
      };
    }
  }, [ageGroup, ritual]);

  return (
    <div
      data-ritual={ritual.id}
      data-completed={ritual.completed ? 'true' : 'false'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: ageGroup === 'child' ? '12px 14px' : '10px 12px',
        borderRadius: 'var(--p31-radius-md)',
        border: `1px solid ${overdue ? 'rgba(245,158,11,0.4)' : 'var(--p31-glass-border)'}`,
        background: 'var(--p31-glass-bg-strong)',
      }}
    >
      <span style={{ fontSize: ageGroup === 'child' ? 24 : 18 }}>{ritual.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: ageGroup === 'child' ? 'var(--p31-scale-md)' : 'var(--p31-scale-sm)',
            color: ritual.completed ? 'var(--p31-text-tertiary)' : 'var(--p31-text)',
            textDecoration: ritual.completed ? 'line-through' : 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontWeight: ageGroup === 'child' ? 600 : 400,
          }}
        >
          {displayText}
        </div>
        <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)' }}>
          {ageGroup === 'child' ? (
            displayReward
          ) : (
            `${overdue ? 'Overdue' : `Due ${timeAgo(ritual.dueAt)}`} · ${displayReward}`
          )}
        </div>
      </div>
      {ritual.completed ? (
        <span
          style={{
            color: 'var(--p31-accent-green)',
            fontSize: ageGroup === 'child' ? 'var(--p31-scale-lg)' : 'var(--p31-scale-sm)',
          }}
        >
          ✓
        </span>
      ) : (
        <button
          type="button"
          className="btn ghost"
          style={{
            padding: ageGroup === 'child' ? '6px 12px' : '4px 10px',
            fontSize: ageGroup === 'child' ? 'var(--p31-scale-sm)' : 'var(--p31-scale-xs)',
            background: ageGroup === 'child' ? 'var(--p31-accent)' : undefined,
            color: ageGroup === 'child' ? '#000' : undefined,
          }}
          onClick={() => onComplete(ritual.id)}
        >
          {completeBtnText}
        </button>
      )}
    </div>
  );
}
