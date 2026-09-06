import type { Atom } from '../lib/game';
import { ZONE_EMOJI, ZONE_NAME } from '../lib/game';

interface AtomRowProps {
  atom: Atom;
  onPing: (atom: Atom) => void;
}

export default function AtomRow({ atom, onPing }: AtomRowProps) {
  return (
    <div className="atom-row" role="listitem">
      <div className={`avatar ${atom.color}`}>{atom.av}</div>
      <div className="atom-info">
        <div className="atom-name">{atom.name}</div>
        <div className="atom-meta">
          {ZONE_EMOJI[atom.zone]} {ZONE_NAME[atom.zone]} · {atom.bonds} bonds
        </div>
      </div>
      <button className="ping-btn" onClick={() => onPing(atom)}>
        Ping
      </button>
    </div>
  );
}
