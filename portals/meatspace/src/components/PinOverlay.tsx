interface PinOverlayProps {
  title: string;
  desc: string;
  onComplete: (pin: string) => void;
  onCancel: () => void;
}

export default function PinOverlay({ title, desc, onComplete, onCancel }: PinOverlayProps) {
  return (
    <div id="pinOverlay" className="pin-ov">
      <div className="pin-panel">
        <h2>{title}</h2>
        <p>{desc}</p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          pattern="[0-9]*"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onComplete((e.target as HTMLInputElement).value);
            }
          }}
          onBlur={(e) => {
            if (e.target.value) onComplete(e.target.value);
          }}
        />
        <button className="btn secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
