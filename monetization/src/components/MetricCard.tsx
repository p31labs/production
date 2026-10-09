import type { ReactNode } from 'react';
import { StatusBadge, type MetricStatus } from './StatusBadge';
import { Sparkline } from './Sparkline';

type Accent = 'cyan' | 'violet' | 'gold' | 'green' | 'red';

interface MetricCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: Accent;
  status?: MetricStatus;
  lastUpdated?: Date | null;
  delta?: number | null;
  sparkline?: number[];
  foot?: ReactNode;
}

/** MetricCard — QM metric tile with five-state feedback, delta, and sparkline. */
export function MetricCard({
  label,
  value,
  sub,
  accent = 'cyan',
  status = 'live',
  lastUpdated,
  delta,
  sparkline,
  foot,
}: MetricCardProps) {
  const deltaDir = delta == null ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

  return (
    <div className="metric-card" data-accent={accent}>
      <div className="metric-card__head">
        <span className="metric-label">{label}</span>
        <StatusBadge status={status} lastUpdated={lastUpdated} />
      </div>
      <span className="metric-value">{value}</span>
      {sub != null && <span className="metric-sub">{sub}</span>}

      {(delta != null || sparkline) && (
        <div className="metric-card__trend">
          {delta != null && (
            <span className={`metric-delta${deltaDir ? ` metric-delta--${deltaDir}` : ''}`} data-dir={deltaDir ?? undefined}>
              {deltaDir === 'up' ? '▲' : deltaDir === 'down' ? '▼' : '•'} {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {sparkline != null && <Sparkline points={sparkline} accent={accent} />}
        </div>
      )}

      {foot != null && <div className="metric-foot">{foot}</div>}
    </div>
  );
}

export default MetricCard;