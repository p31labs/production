interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  steps?: string[];
}

export default function EmptyState({
  icon = '🚀',
  title,
  description,
  actionLabel,
  onAction,
  steps,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {steps && steps.length > 0 && (
        <ul className="empty-state-steps">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
      {actionLabel && onAction && (
        <button className="btn btn-secondary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
