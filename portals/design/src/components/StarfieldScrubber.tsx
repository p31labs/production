import { useState } from 'react';
import { drivePhase, driveMorphSpeed, resumeAutoplay } from '../lib/starfield-instance';

const SHAPES = ['Cuboctahedron', '→ Icosahedron', 'Icosahedron', '→ Octahedron', 'Octahedron'];

/**
 * Foreground control that hand-drives the CANONICAL jitterbug morph in the
 * ambient background. phase ∈ [0,1]: 0=cubocta · 0.5=icosa · 1=octa.
 * Release returns control to the spoon-driven autoplay.
 */
export default function StarfieldScrubber() {
  const [phase, setPhase] = useState(0.5);
  const [scrubbing, setScrubbing] = useState(false);

  const shapeName = SHAPES[Math.min(4, Math.floor(phase * 4))];

  const release = () => {
    setScrubbing(false);
    const s = Number(document.documentElement.getAttribute('data-spoons') ?? 3);
    resumeAutoplay(s);
  };

  return (
    <div className="scrubber" role="group" aria-label="Jitterbug phase control">
      <div className="scrubber-head">
        <span className="scrubber-label">Jitterbug phase — drag to drive the morph</span>
        <span className="scrubber-shape" aria-live="polite">{shapeName}</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={phase}
        aria-label="Scrub the Jitterbug transformation"
        aria-valuetext={shapeName}
        onChange={(e) => {
          const p = Number(e.target.value);
          setPhase(p);
          drivePhase(p);
          driveMorphSpeed(0.5);
        }}
        onPointerDown={() => setScrubbing(true)}
        onPointerUp={release}
        onKeyUp={release}
      />
      <div className="scrubber-foot">
        <span>Fuller's transformation, hand-driven</span>
        <span className="scrubber-hint">{scrubbing ? 'scrubbing…' : 'release to let it breathe'}</span>
      </div>
    </div>
  );
}
