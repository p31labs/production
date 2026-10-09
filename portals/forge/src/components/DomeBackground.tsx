import { Suspense } from 'react';
import MolecularHeart from '@p31ca/p31ca-ambient/background/MolecularHeart';
import Starfield from '@p31ca/p31ca-ambient/background/Starfield';

/**
 * The forge's ambient — the dome (molecular heart + LED ring) and starfield,
 * same ambient the design portal renders. Lazy-mounts inside the shell's
 * ambient slot (the chameleon frame: both portals render the same dome).
 */
export function DomeBackground() {
  return (
    <div className="dome-surface" aria-hidden="true">
      <Suspense fallback={null}>
        <Starfield />
        <MolecularHeart />
      </Suspense>
    </div>
  );
}

export default DomeBackground;