import { useCallback, useMemo, useState } from 'react';
import type { PresentationPrefs } from './profile';

const STORAGE_KEY = 'loom:presentation';

/**
 * Editable presentation state — the visible controls' source of truth.
 *
 * `useProfile` resolves presentation from the profile store + URL params, but
 * that resolution is read-only. This hook lifts the discrete tiers into
 * editable state so the UI can surface Motion / Saturation / Literal-labels /
 * Calm-mode as real toggles, and persists the overrides to localStorage
 * (presentation-layer state, never the log — same rule as the theme).
 *
 * The OS `prefers-reduced-motion` floor still wins for `motion`: a "full"
 * selection is floored to `reduced` under the OS preference (the same rule
 * App.tsx applies). Accessibility floor is never below the baseline.
 */
export function usePresentationState(seed: PresentationPrefs) {
  const [motion, setMotion] = useState<'full' | 'reduced' | 'none'>(
    () => (read('motion', seed.motion) as 'full' | 'reduced' | 'none'),
  );
  const [saturation, setSaturation] = useState<'normal' | 'muted'>(
    () => (read('saturation', seed.saturation) as 'normal' | 'muted'),
  );
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>(
    () => (read('density', seed.density) as 'compact' | 'comfortable' | 'spacious'),
  );
  const [literalLabels, setLiteralLabels] = useState<boolean>(() => read('literal', seed.literalLabels ? '1' : '0') === '1');

  /** A "Calm mode" toggle: one tap sets muted saturation + reduced motion +
   *  spacious density + literal labels — the low-stimulation preset from the
   *  neurodivergent-comfort research (accessiBe: calm/focus mode). Reversible:
   *  turning it off restores the prior axis values. */
  const [calm, setCalm] = useState<boolean>(() => read('calm', '0') === '1');
  const [savedAxes, setSavedAxes] = useState<{
    motion: 'full' | 'reduced' | 'none';
    saturation: 'normal' | 'muted';
    density: 'compact' | 'comfortable' | 'spacious';
    literal: boolean;
  } | null>(null);

  const update = useCallback(<T,>(key: string, value: T, setter: (v: T) => void, next: T) => {
    setter(next);
    if (typeof localStorage !== 'undefined') {
      const cur = readRaw();
      cur[key] = String(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cur));
    }
  }, []);

  const setMotionState = useCallback((v: 'full' | 'reduced' | 'none') => update('motion', v, setMotion, v), [update]);
  const setSaturationState = useCallback((v: 'normal' | 'muted') => update('saturation', v, setSaturation, v), [update]);
  const setDensityState = useCallback((v: 'compact' | 'comfortable' | 'spacious') => update('density', v, setDensity, v), [update]);
  const setLiteralLabelsState = useCallback((v: boolean) => update('literal', v, setLiteralLabels, v), [update]);

  const toggleCalm = useCallback(() => {
    setCalm((prev) => {
      const next = !prev;
      if (typeof localStorage !== 'undefined') {
        const cur = readRaw();
        if (next) {
          // Entering calm: save the axes so turning off restores them.
          setSavedAxes({ motion, saturation, density, literal: literalLabels });
          cur.calm = '1';
          cur.motion = 'reduced';
          cur.saturation = 'muted';
          cur.density = 'spacious';
          cur.literal = '1';
          setMotion('reduced');
          setSaturation('muted');
          setDensity('spacious');
          setLiteralLabels(true);
        } else {
          // Leaving calm: restore the saved axes.
          const saved = savedAxes;
          if (saved) {
            cur.motion = saved.motion;
            cur.saturation = saved.saturation;
            cur.density = saved.density;
            cur.literal = saved.literal ? '1' : '0';
            setMotion(saved.motion);
            setSaturation(saved.saturation);
            setDensity(saved.density);
            setLiteralLabels(saved.literal);
          }
          setSavedAxes(null);
          cur.calm = '0';
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cur));
      }
      return next;
    });
  }, [motion, saturation, density, literalLabels, savedAxes]);

  // When calm is on, the axes follow the calm preset even if toggled off then
  // the calm flag is separately reset when a user explicitly changes an axis.
  const effectiveMotion = calm ? 'reduced' : motion;
  const effectiveSaturation = calm ? 'muted' : saturation;
  const effectiveDensity = calm ? 'spacious' : density;
  const effectiveLiteral = calm ? true : literalLabels;

  const value = useMemo(
    () => ({ motion: effectiveMotion, saturation: effectiveSaturation, density: effectiveDensity, literalLabels: effectiveLiteral }),
    [effectiveMotion, effectiveSaturation, effectiveDensity, effectiveLiteral],
  );

  return {
    ...value,
    calm,
    toggleCalm,
    setMotion: setMotionState,
    setSaturation: setSaturationState,
    setDensity: setDensityState,
    setLiteralLabels: setLiteralLabelsState,
  };
}

function readRaw(): Record<string, string> {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function read(key: string, fallback: string): string {
  const v = readRaw()[key];
  return v ?? fallback;
}