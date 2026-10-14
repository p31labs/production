import { useEffect } from 'react';
import { useSensoryStore } from '../store/useSensoryStore';
import { useThemeStore } from '../store/useThemeStore';

export function useSensorySync() {
  useEffect(() => {
    const sync = () => {
      const root = document.documentElement;
      const s = useSensoryStore.getState();
      root.setAttribute('data-calm', String(s.calm));
      root.setAttribute('data-focus', String(s.focus));
      root.setAttribute('data-simple', String(s.simple));
      root.setAttribute('data-task', String(s.task));
      root.setAttribute('data-font', s.font);
      root.setAttribute('data-text-scale', s.textScale);
      useThemeStore.getState().applyTheme();
    };
    sync();
    return useSensoryStore.subscribe(sync);
  }, []);
}
