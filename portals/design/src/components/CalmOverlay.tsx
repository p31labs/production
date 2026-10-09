import { useEffect, useRef } from 'react';
import { CalmOverlay as CanonCalmOverlay, type CalmSession } from '@p31ca/design-core/compositions';
import { useSpoonsStore } from '../lib/useSpoonsStore';
import { useEffectsStore } from '@p31ca/p31ca-ambient/stores/effectsStore';
import { applyCalmLedPhase } from '@p31ca/p31ca-ambient/stores/ledStore';

const CALM_SIGH_MS = 60_000;
const CALM_LOG_KEY = 'p31:calm-sessions';
const CALM_LOG_CAP = 50;

/** Append a calm session to the local recovery log (oldest-capped). */
function recordCalmSession(session: CalmSession) {
  try {
    const existing = JSON.parse(localStorage.getItem(CALM_LOG_KEY) ?? '[]') as CalmSession[];
    localStorage.setItem(CALM_LOG_KEY, JSON.stringify([...existing, session].slice(-CALM_LOG_CAP)));
  } catch {
    // Non-fatal — the calm surface never depends on the log.
  }
}

/**
 * CalmOverlay — the regulation instrument (CALM-MODE.md). Wraps the canon mode
 * controller (which drives data-calm on <html>, hiding chrome and keeping the
 * ambient) and bridges it to the ambient instrument: the LED ring becomes the
 * breathing guide (physiological sigh → coherence), haptic is primary.
 *
 * Renders nothing. The dome/starfield/heart ARE the calm visual.
 */
export function CalmOverlay() {
  const spoons = useSpoonsStore((s) => s.spoons);
  const setSpoons = useSpoonsStore((s) => s.setSpoons);
  const exitTimer = useRef<number | null>(null);

  const onEnterCalm = () => {
    const effects = useEffectsStore.getState();
    effects.setCalm(true);
    effects.setCalmPhase('sigh');
    applyCalmLedPhase('sigh');
    exitTimer.current = window.setTimeout(() => {
      useEffectsStore.getState().setCalmPhase('coherence');
      applyCalmLedPhase('coherence');
    }, CALM_SIGH_MS);
  };

  const onExit = () => {
    if (exitTimer.current !== null) { window.clearTimeout(exitTimer.current); exitTimer.current = null; }
    useEffectsStore.getState().setCalm(false);
    setSpoons(2);
  };

  // Tapping the LED chip during calm exits calm (the chip dispatches this event).
  useEffect(() => {
    const onChip = () => onExit();
    window.addEventListener('p31:exit-calm', onChip);
    return () => window.removeEventListener('p31:exit-calm', onChip);
  }, [onExit]);

  return (
    <CanonCalmOverlay
      spoons={spoons}
      onExit={onExit}
      onEnterCalm={onEnterCalm}
      onSessionEnd={recordCalmSession}
    />
  );
}

export default CalmOverlay;