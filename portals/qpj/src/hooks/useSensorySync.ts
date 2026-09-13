import { useEffect, useRef } from 'react';
import { getProfile, updateTetrahedronVertex } from '@p31/sovereign-core';
import { useQpjStore } from '../store/useQpjStore';
import type { Preferences } from '@p31/sovereign-core';

const DEBOUNCE_MS = 300;

const SENSORY_KEYS = [
  'motionScale',
  'soundScale',
  'contrastTarget',
  'density',
  'breathPattern',
  'zeitgeber',
  'spoonQuadrants',
  'mood',
  'spoons',
] as const;

const IMMEDIATE_KEYS = new Set(['breathPattern', 'zeitgeber', 'mood']);

export function useSensorySync(): void {
  const timer = useRef<number | null>(null);
  const lastWritten = useRef<string | null>(null);

  const flush = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const s = useQpjStore.getState();
    const prefs: Preferences = {
      spoons: s.spoons,
      spoonQuadrants: s.spoonQuadrants,
      darkMode: s.darkMode,
      reduceMotion: s.motionScale < 0.5,
      soundEffects: s.soundScale > 0,
      mood: s.mood,
      motionScale: s.motionScale,
      soundScale: s.soundScale,
      contrastTarget: s.contrastTarget,
      density: s.density,
      breathPattern: s.breathPattern,
      zeitgeber: s.zeitgeber,
    };
    const serialized = JSON.stringify(prefs);
    if (serialized === lastWritten.current) return;
    lastWritten.current = serialized;
    updateTetrahedronVertex(2, prefs);
  };

  useEffect(() => {
    const profile = getProfile();
    const vertex = profile.tetrahedron.vertices[2];
    if (vertex.type === 'preferences') {
      useQpjStore.getState().hydrateSensory(vertex.value);
    }

    const unsub = useQpjStore.subscribe((state, prevState) => {
      const changedKey = SENSORY_KEYS.find(
        (k) => JSON.stringify(state[k]) !== JSON.stringify(prevState[k]),
      );

      if (!changedKey) return;

      const s = useQpjStore.getState();
      const prefs: Preferences = {
        spoons: s.spoons,
        spoonQuadrants: s.spoonQuadrants,
        darkMode: s.darkMode,
        reduceMotion: s.motionScale < 0.5,
        soundEffects: s.soundScale > 0,
        mood: s.mood,
        motionScale: s.motionScale,
        soundScale: s.soundScale,
        contrastTarget: s.contrastTarget,
        density: s.density,
        breathPattern: s.breathPattern,
        zeitgeber: s.zeitgeber,
      };
      const serialized = JSON.stringify(prefs);
      if (serialized === lastWritten.current) return;

      if (IMMEDIATE_KEYS.has(changedKey)) {
        flush();
        return;
      }

      if (timer.current) clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, DEBOUNCE_MS);
    });

    const onVisibility = () => {
      if (document.hidden) flush();
    };
    const onPageHide = () => flush();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      flush();
      unsub();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);
}
