import { useEffect, useRef } from 'react';

/** Acute sigh phase duration before settling into sustained coherence. */
export const CALM_SIGH_MS = 60_000;

/** Locked two-phase timeline (see CALM-MODE.md): physiological sigh for the first
 *  60s (double inhale, extended exhale), then 6 BPM coherence. Exhale-emphasized,
 *  no breath holds, opacity-only breathing guide. */
export const CALM_PHASES = {
  sigh: { id: 'sigh', durationMs: CALM_SIGH_MS },
  coherence: { id: 'coherence' },
} as const;

export type CalmPhase = 'sigh' | 'coherence';

/** Pure phase transition: calm is in the acute 'sigh' phase for the first
 *  `sighMs`, then settles into sustained 'coherence'. Testable without a clock. */
export function calmPhaseAt(elapsedMs: number, sighMs: number = CALM_SIGH_MS): CalmPhase {
  return elapsedMs < sighMs ? 'sigh' : 'coherence';
}

/** A completed calm session — the recovery signal. Logged on exit so the host
 *  can surface recovery-time trends across sessions (CALM-MODE.md §8). "Felt
 *  calm" is a poor measure for atypical interoception; recovery time is not. */
export interface CalmSession {
  startedAt: number;
  endedAt: number;
  durationMs: number;
  spoonsAtEntry: number;
  spoonsAtExit: number;
}

export interface CalmOverlayProps {
  /** Current spoon level; calm activates at 0. */
  spoons: number;
  /** Called when the user exits calm (Esc, tap LED chip, spoon-restore). */
  onExit: () => void;
  /** Optional hook fired on entry — the ambient consumer applies the LED calm
   *  preset and the haptic pattern. */
  onEnterCalm?: () => void;
  /** Called once when a calm session ends, with the session record. */
  onSessionEnd?: (session: CalmSession) => void;
  /** Physiological sigh first, then sustained coherence (default true). */
  sighFirst?: boolean;
}

/** CalmOverlay — the regulation instrument (see CALM-MODE.md). Renders NOTHING:
 *  calm is subtraction, not a modal. It drives `data-calm` on <html> so the CSS
 *  hides chrome while keeping the ambient (dome, starfield, molecular heart), and
 *  exposes `data-calm-phase` ('sigh' → 'coherence') for the ambient breathing guide.
 *  Store-agnostic: `spoons` + `onExit` are props; the consumer owns the store. */
export function CalmOverlay({ spoons, onExit, onEnterCalm, onSessionEnd, sighFirst = true }: CalmOverlayProps) {
  const active = spoons === 0;
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;

    const root = document.documentElement;
    root.dataset.calm = 'true';
    if (sighFirst) root.dataset.calmPhase = 'sigh';
    onEnterCalm?.();
    startedAtRef.current = Date.now();

    // Phase 2 — sustained coherence after the acute sigh window.
    const phaseTimer = sighFirst
      ? window.setTimeout(() => { root.dataset.calmPhase = 'coherence'; }, CALM_SIGH_MS)
      : undefined;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.clearTimeout(phaseTimer);
      window.removeEventListener('keydown', onKey);
      delete root.dataset.calm;
      delete root.dataset.calmPhase;
      if (startedAtRef.current !== null) {
        const startedAt = startedAtRef.current;
        startedAtRef.current = null;
        onSessionEnd?.({
          startedAt,
          endedAt: Date.now(),
          durationMs: Date.now() - startedAt,
          spoonsAtEntry: 0,
          spoonsAtExit: spoons > 0 ? spoons : 1,
        });
      }
    };
  }, [active, sighFirst, onEnterCalm, onExit, onSessionEnd, spoons]);

  return null;
}

export default CalmOverlay;