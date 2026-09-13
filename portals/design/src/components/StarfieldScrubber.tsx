import { useState } from 'react';

const SHAPES = ['Cuboctahedron', '→ Icosahedron', 'Icosahedron', '→ Octahedron', 'Octahedron'];

export default function StarfieldScrubber() {
  const [phase, setPhase] = useState(0.5);
  const [scrubbing, setScrubbing] = useState(false);

  const shapeName = SHAPES[Math.min(4, Math.floor(phase * 4))];

  return (
    <div className="scrubber" role="group" aria-label="Jitterbug phase control">
      <div className="scrubber-head">
        <span className="scrubber-label">Jitterbug phase — drag to drive the morph</span>
        <span className="scrubber-shape" aria-live="polite">{shapeName}</span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={phase}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          setPhase(v);
          setScrubbing(true);
        }}
        onKeyUp={() => {}}
        className="scrubber-range"
        aria-valuetext={shapeName}
      />
      <div className="text-xs text-text-tertiary mt-1">
        {scrubbing ? 'Scrubbing…' : 'Auto (spoon-driven)'}
      </div>
    </div>
  );
}
