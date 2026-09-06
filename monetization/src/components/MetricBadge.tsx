interface MetricBadgeProps {
  label: string;
  value: string | number;
  accent?: string;
}

export default function MetricBadge({ label, value, accent }: MetricBadgeProps) {
  return (
    <div className="metric-badge">
      <span className="metric-badge-label">{label}</span>
      <span className="metric-badge-value" style={accent ? { color: accent } : undefined}>
        {value}
      </span>
    </div>
  );
}
