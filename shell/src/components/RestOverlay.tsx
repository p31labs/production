import { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useAppStore } from '../store/useAppStore';
import { useSensoryStore } from '../store/useSensoryStore';
import { StarfieldField } from '@p31ca/spaceship-earth/src/cockpit/StarfieldField';
import { DomeGeometry } from '@p31ca/shell-chrome';
import { useFocusTrap } from '../hooks/useFocusTrap';

// Rest mode — full-screen calm scene: starfield + breathing dome + vignette.
// No UI chrome; only the Return pill + Escape exit.

interface RestOverlayProps {
  onDismiss: () => void;
}

export default function RestOverlay({ onDismiss }: RestOverlayProps) {
  const reduceMotion = useAppStore((s) => s.reduceMotion);
  const calm = useSensoryStore((s) => s.calm);
  const staticFrame = reduceMotion || calm;

  const { panelRef } = useFocusTrap(true, onDismiss);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onDismiss]);

  return (
    <div id="rest-overlay" ref={panelRef} role="dialog" aria-modal="true" aria-label="Rest mode">
      <div id="rest-scene" aria-hidden="true">
        <Canvas
          frameloop={staticFrame ? 'never' : 'always'}
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
          camera={{ position: [0, 1.5, 8], fov: 55 }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[4, 6, 5]} intensity={0.8} />
          <StarfieldField spoons={3} count={1400} reduceMotion={staticFrame} speed={0.4} calm={calm} />
          <DomeGeometry mode="delta" spoons={3} calm={calm} nodeCount={12} />
        </Canvas>
        <div id="rest-vignette" />
      </div>
      <button id="rest-return" onClick={onDismiss} aria-label="Return to interface (Escape)">
        ↩ Return
      </button>
    </div>
  );
}
