/**
 * DomeBackground — the portal-wide ambient background: the EXACT p31ca.org
 * composition — <Starfield /> (2D seeded starfield, twinkle + flares) overlaid
 * by <MolecularHeart /> (GLSL LED dome frame + plasma heart blob) — consumed
 * from the vendored @p31/p31ca-ambient package (never a fork). The LED
 * controller is mounted globally in App.tsx, exactly like p31ca.org.
 *
 * A spoon bridge keeps the portal's spoon system in lock-step with the
 * ambient's crisis floor (spoons ≤ 1 → single static frame, no motion).
 *
 * `orbitable` arms drag-to-orbit (the /dome surface): the vendored
 * MolecularHeart's document-level drag handler rotates the dome when the
 * layer carries data-orbit="true".
 */
import { lazy, Suspense, useEffect } from 'react';
import { useSpoonsStore } from '../lib/useSpoonsStore';

const Starfield = lazy(() => import('@p31/p31ca-ambient/background/Starfield'));
const MolecularHeart = lazy(() => import('@p31/p31ca-ambient/background/MolecularHeart'));

/** Spoon bridge — syncs the portal spoons into the ambient's crisis floor.
 *  The ambient store is imported dynamically and only after `ready` so the
 *  vendor-p31ca-ambient chunk (570KB, three.js) stays OUT of the initial
 *  graph — a static effectsStore import would load it eagerly. */
function useSpoonBridge(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    let unsub: (() => void) | undefined;
    let cancelled = false;
    void import('@p31/p31ca-ambient/stores/effectsStore').then(({ useEffectsStore }) => {
      if (cancelled) return;
      const sync = () => useEffectsStore.getState().setSpoons(useSpoonsStore.getState().spoons);
      sync();
      unsub = useSpoonsStore.subscribe(sync);
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [ready]);
}

export default function DomeBackground({ orbitable = false, ready = true }: { orbitable?: boolean; ready?: boolean }) {
  useSpoonBridge(ready);
  return (
    <div className="starfield-bg dome-bg" data-orbit={orbitable ? 'true' : 'false'} aria-hidden="true">
      {ready && (
        <Suspense fallback={null}>
          <Starfield />
          <MolecularHeart />
        </Suspense>
      )}
    </div>
  );
}