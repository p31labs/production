import { useEffect } from 'react';
import { useQpjStore } from '../store/useQpjStore';
import { getPassport } from '../lib/passports';

/**
 * Mirrors app state onto <html data-*> + <style> so CSS tokens,
 * spoon-aware motion, and theme contracts stay in one place.
 */
export function useModeEffects(): void {
  const passportId = useQpjStore((s) => s.passportId);
  const mode = useQpjStore((s) => s.mode);
  const spoons = useQpjStore((s) => s.spoons);
  const darkMode = useQpjStore((s) => s.darkMode);
  const reduceMotion = useQpjStore((s) => s.reduceMotion);
  const soundEffects = useQpjStore((s) => s.soundEffects);

  useEffect(() => {
    const root = document.documentElement;
    const passport = getPassport(passportId);
    root.dataset.mode = mode;
    root.dataset.passport = passportId;
    root.dataset.hue = String(passport.accentHue);
    root.dataset.spoons = String(spoons);
    root.dataset.sound = soundEffects ? 'on' : 'off';
    root.style.setProperty('--p31-spoon-level', String(spoons));
    root.classList.toggle('is-dark', darkMode);
    root.classList.toggle('is-reduced-motion', reduceMotion);
  }, [passportId, mode, spoons, darkMode, reduceMotion, soundEffects]);
}