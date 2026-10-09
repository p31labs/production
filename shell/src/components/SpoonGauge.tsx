import { useDualEconomyStore } from '../features/economy';
import A2Meter from './ui/A2Meter';
import A2Button from './ui/A2Button';

const TIER_COLOR: Record<string, string> = {
  FULL: 'var(--p31-accent-green)',
  MEDIUM: 'var(--p31-accent-green)',
  LOW: 'var(--p31-accent-gold)',
  STAND_DOWN: 'var(--p31-accent-red)',
};

const TIER_LABEL: Record<string, string> = {
  FULL: 'Full',
  MEDIUM: 'Medium',
  LOW: 'Low',
  STAND_DOWN: 'Stand down',
};

export default function SpoonGauge({ onAssess }: { onAssess?: () => void }) {
  const budget = useDualEconomyStore((s) => s.budget);
  const did = useDualEconomyStore((s) => s.did);
  const hasHydrated = useDualEconomyStore((s) => s._hasHydrated);

  const pct = budget.netBudget > 0 ? (budget.remaining / budget.netBudget) * 100 : 0;
  const color = TIER_COLOR[budget.tier] ?? 'var(--p31-accent)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-tiny)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--p31-space-tiny)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-tiny)' }}>
          <span
            className="status-dot"
            style={{
              background: color,
              boxShadow: `0 0 8px ${color}`,
            }}
            aria-hidden="true"
          />
          <span style={{ fontSize: 'var(--p31-scale-sm)', fontWeight: 600, color: 'var(--p31-text)' }}>
            {budget.remaining}/{budget.netBudget} spoons
          </span>
        </div>
        <span
          style={{
            fontSize: 'var(--p31-scale-xs)',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color,
          }}
        >
          {TIER_LABEL[budget.tier] ?? budget.tier}
        </span>
      </div>

      <A2Meter
        value={budget.remaining}
        min={0}
        max={budget.netBudget}
        color={color}
        label={`${Math.round(pct)}%`}
      />

      {budget.borrowed > 0 && (
        <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-accent-gold)' }}>
          ⚠ {budget.borrowed} borrowed — {budget.tomorrowPenalty} due tomorrow
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--p31-space-tiny)' }}>
        <span style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)' }}>
          {hasHydrated && did ? did.slice(0, 10) : 'not assessed yet'}
        </span>
        <A2Button label="Morning assessment" onClick={onAssess} />
      </div>
    </div>
  );
}
