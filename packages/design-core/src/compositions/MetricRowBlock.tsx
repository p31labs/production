export interface MetricItem {
  value: string;
  label: string;
}

export interface MetricRowBlockProps {
  /** Ordered metric items — value + label (e.g. 48 / packs). */
  items: MetricItem[];
  className?: string;
}

/** MetricRowBlock — a page block: an ordered row of value+label metrics. The
 *  simplest registry:block — pure props, no ambient, no state. Promoted from
 *  the portal home-page metrics (48 packs / 6 domains / read-only / offline). */
export function MetricRowBlock({ items, className = '' }: MetricRowBlockProps) {
  return (
    <div className={`metric-row ${className}`.trim()}>
      {items.map((m, i) => (
        <div className="metric" key={i}>
          <span className="metric__value">{m.value}</span>
          <span className="metric__label">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

export default MetricRowBlock;