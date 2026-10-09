import { useState } from 'react';
import { useSpoonsStore } from '../lib/useSpoonsStore';
import { hapticConfirm } from '../lib/haptics';

const LEVELS = [0, 1, 2, 3, 4, 5];

/**
 * FloatingSpoonDial — one-tap capacity control on mobile. Tap the pill to
 * expand a 0–5 dial; tap a level to set data-spoons + --motion-scale (via
 * useSpoonsStore) and collapse. Sits above the bottom nav, safe-area aware.
 * The collapsed pill doubles as a persistent capacity readout.
 */
export function FloatingSpoonDial() {
  const spoons = useSpoonsStore((s) => s.spoons);
  const setSpoons = useSpoonsStore((s) => s.setSpoons);
  const [open, setOpen] = useState(false);

  return (
    <div className="spoon-fab" data-open={open}>
      <button
        type="button"
        className="spoon-fab__trigger"
        aria-label={`Spoons ${spoons} — tap to adjust`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">🥄</span>
        <span className="spoon-fab__value">{spoons}</span>
      </button>
      {open && (
        <div className="spoon-fab__levels" role="group" aria-label="Set spoon level">
          {LEVELS.map((n) => (
            <button
              key={n}
              type="button"
              className="spoon-fab__level"
              data-active={n === spoons}
              aria-label={`Set spoons to ${n}`}
              onClick={() => {
                hapticConfirm();
                setSpoons(n);
                setOpen(false);
              }}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default FloatingSpoonDial;