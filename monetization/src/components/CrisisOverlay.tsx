interface CrisisOverlayProps {
  message: string;
  onDismiss?: () => void;
}

export default function CrisisOverlay({ message, onDismiss }: CrisisOverlayProps) {
  return (
    <div className="crisis-overlay" role="alert">
      <div className="crisis-overlay-content">
        <div className="crisis-overlay-icon">⚠️</div>
        <h2 className="crisis-overlay-title">System Alert</h2>
        <p className="crisis-overlay-message">{message}</p>
        {onDismiss && (
          <button className="crisis-overlay-dismiss" onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
