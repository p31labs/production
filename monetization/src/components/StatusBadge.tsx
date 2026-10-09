export type MetricStatus = 'loading' | 'live' | 'stale' | 'error' | 'empty';

interface StatusBadgeProps {
  status: MetricStatus;
  lastUpdated?: Date | null;
}

const LABEL: Record<MetricStatus, string> = {
  loading: 'LOADING',
  live: 'LIVE',
  stale: 'STALE',
  error: 'ERROR',
  empty: 'EMPTY',
};

const COLOR: Record<MetricStatus, string> = {
  loading: 'var(--p31-cloud)',
  live: 'var(--p31-accent-green)',
  stale: 'var(--p31-accent-gold)',
  error: 'var(--p31-accent-red)',
  empty: 'var(--p31-text-muted)',
};

/**
 * Five-state data feedback: loading / live / stale / error / empty.
 * Replaces silent "…" placeholders — every metric card must resolve to one.
 */
export function StatusBadge({ status, lastUpdated }: StatusBadgeProps) {
  const time = lastUpdated ? lastUpdated.toLocaleTimeString() : null;
  const title = time ? `${LABEL[status]} — last sync ${time}` : LABEL[status];
  return (
    <span
      className="status-badge-pill"
      role="status"
      title={title}
      style={{
        color: COLOR[status],
        background: `color-mix(in oklch, ${COLOR[status]} 12%, transparent)`,
        border: `1px solid color-mix(in oklch, ${COLOR[status]} 30%, transparent)`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: COLOR[status],
          animation: status === 'loading' ? 'status-pulse 1.2s ease-in-out infinite' : undefined,
        }}
      />
      {LABEL[status]}
    </span>
  );
}

export default StatusBadge;