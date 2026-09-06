type Status = 'live' | 'beta' | 'research' | 'down';

interface StatusBadgeProps {
  status: Status;
  label?: string;
}

const statusConfig: Record<Status, { className: string; defaultLabel: string }> = {
  live: { className: 'status-badge-live', defaultLabel: 'Live' },
  beta: { className: 'status-badge-beta', defaultLabel: 'Beta' },
  research: { className: 'status-badge-research', defaultLabel: 'Research' },
  down: { className: 'status-badge-down', defaultLabel: 'Down' },
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.research;
  return (
    <span className={`status-badge ${config.className}`}>
      {label ?? config.defaultLabel}
    </span>
  );
}
