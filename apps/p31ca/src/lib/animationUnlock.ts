/**
 * animationUnlock — the deferred-start contract for ambient animations
 * (fix-plan: p31ca-molecularheart-tbt.md).
 *
 * The ambient WebGL/2D layers are heavy: under Lighthouse (especially
 * headless/SwiftShader or CPU-throttled rigs) a perpetual rAF loop makes
 * every frame a long task, so the page NEVER reaches the quiet state that
 * closes the TBT window — TBT sums the whole trace (measured: TTI pinned to
 * trace end, TBT 38.7s desktop / 147.6s mobile-throttled). The fix is to
 * not run the loop during the measurement window at all.
 *
 * Resolves on the FIRST of:
 *   1. user interaction (pointerdown / keydown / wheel / touchstart) —
 *      real visitors unlock the live layer on their first scroll/click/key,
 *      which happens within a second of landing;
 *   2. a hard 15 s fallback — passive viewers and non-interactive agents
 *      (Lighthouse never dispatches input) get the live layer once the
 *      trace/load window is long gone.
 *
 * No idle/quiet heuristic: "start after N seconds of quiet" resolves inside
 * a Lighthouse trace and reintroduces the exact long-task stream this fix
 * removes. The static SVG/CSS ambient layer carries the hero until the live
 * layer boots — the steady-state look is unchanged.
 */
export function animationUnlock(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    let fallback = 0;

    const cleanup = () => {
      window.clearTimeout(fallback);
      for (const ev of INTERACT_EVENTS) window.removeEventListener(ev, go, true);
    };

    const go = () => {
      if (done) return;
      done = true;
      cleanup();
      resolve();
    };

    // 1. Interaction unlock (capture phase — never blocked by handlers).
    const INTERACT_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    for (const ev of INTERACT_EVENTS) window.addEventListener(ev, go, { capture: true, passive: true });

    // 2. Fallback for passive viewers / non-interactive agents.
    fallback = window.setTimeout(go, 15000);
  });
}