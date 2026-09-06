import type { Atom } from '../lib/game';

interface PingModalProps {
  atom: Atom | null;
  onClose: () => void;
}

export default function PingModal({ atom, onClose }: PingModalProps) {
  if (!atom) return null;

  return (
    <div className="modal-ov show" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h2 id="pingTitle">🐦 Ping sent to {atom.name}!</h2>
        <p id="pingBody">They'll be notified.</p>
        <div className="modal-row">
          <button className="btn" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}
