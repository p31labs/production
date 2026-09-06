interface BreakOverlayProps {
  onDismiss: () => void;
  onExtend: () => void;
}

export default function BreakOverlay({ onDismiss, onExtend }: BreakOverlayProps) {
  return (
    <div id="break-overlay" role="dialog" aria-labelledby="break-title" aria-modal="true">
      <div className="breathing-circle" aria-hidden="true"></div>
      <div className="crisis-text" id="break-title">🌿 Time for a break!</div>
      <p style={{ fontSize: 'var(--p31-type-body)', color: 'var(--p31-text-secondary)', textAlign: 'center', maxWidth: '280px', lineHeight: 1.5 }}>
        You've been using Willow for a while. Take a moment to breathe and rest.
      </p>
      <div style={{ display: 'flex', gap: 'var(--p31-space-sm)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="button" onClick={onDismiss}>OK, take a break</button>
        <button className="button secondary" onClick={onExtend}>🔒 More time (enter PIN)</button>
      </div>
    </div>
  );
}
