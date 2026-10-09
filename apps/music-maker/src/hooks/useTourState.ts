/**
 * The music maker — guided tour state.
 *
 * Three steps teach the loop gradually (the MOTS/spatial-audio finding: users
 * under-use tools they can't learn, so the interface must teach itself):
 *
 *   look  → first camera drag
 *   place → first successful placement commit
 *   play  → first zone trigger
 *
 * Completing ANY step completes the earlier ones (doing "play" implies you
 * understood "look"), and completing the last step dismisses the tour. The
 * progress persists across visits via safeStorage (blocks to session-only when
 * the sandboxed iframe can't write).
 */
import { useCallback, useEffect, useState } from 'react';
import { safeGet, safeSet } from '../lib/storage';

export const TOUR_STEPS = ['welcome', 'look', 'place', 'play'] as const;
export type TourStep = (typeof TOUR_STEPS)[number];

const KEY = 'music-maker:tour';

interface TourState {
  /** Highest completed step index; -1 = none. */
  done: number;
  dismissed: boolean;
}

const EMPTY: TourState = { done: -1, dismissed: false };

function read(): TourState {
  const raw = safeGet(KEY);
  if (!raw) return EMPTY;
  try {
    const p = JSON.parse(raw) as Partial<TourState>;
    return {
      done: typeof p.done === 'number' ? p.done : -1,
      dismissed: p.dismissed === true,
    };
  } catch {
    return EMPTY;
  }
}

export interface TourStateResult {
  /** The next step to teach, or null when the tour is done/dismissed. */
  currentStep: TourStep | null;
  /** Complete a step (and everything before it). */
  markDone: (step: TourStep) => void;
  /** Dismiss the tour permanently. */
  dismiss: () => void;
}

export function useTourState(): TourStateResult {
  const [state, setState] = useState<TourState>(read);

  useEffect(() => {
    safeSet(KEY, JSON.stringify(state));
  }, [state]);

  const markDone = useCallback((step: TourStep) => {
    setState((s) => {
      const idx = TOUR_STEPS.indexOf(step);
      const done = Math.max(s.done, idx);
      // Finishing the last step dismisses the tour.
      return { done, dismissed: s.dismissed || done === TOUR_STEPS.length - 1 };
    });
  }, []);

  const dismiss = useCallback(() => {
    setState((s) => ({ ...s, dismissed: true }));
  }, []);

  const currentStep: TourStep | null = state.dismissed
    ? null
    : (TOUR_STEPS[state.done + 1] ?? null);

  return { currentStep, markDone, dismiss };
}