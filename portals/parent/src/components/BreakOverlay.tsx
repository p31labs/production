interface BreakOverlayProps {
  onDismiss: () => void;
  onExtend: () => void;
}

export default function BreakOverlay({ onDismiss, onExtend }: BreakOverlayProps) {
  return (
    <div id="breakOverlay" className="break-ov">
      <h2>🌿 Break Time</h2>
      <p>Your session is paused. Take a breath.</p>
      <div style={{ display: 'flex', gap: 'var(--p31-space-sm)', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn" onClick={onExtend}>
          ⏱️ +30 min
        </button>
        <button className="btn secondary" onClick={onDismiss}>
          I'm ready
        </button>
      </div>
    </div>
  );
}
