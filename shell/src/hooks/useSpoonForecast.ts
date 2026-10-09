import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useShellStore } from '../store/useShellStore';
import { getForecast } from '../lib/spoonHistory';

export function useSpoonForecast() {
  useEffect(() => {
    const deduped = new Set<string>();
    const spoons = useAppStore.getState().spoons;
    const addNotification = useShellStore.getState().addNotification;

    const check = async () => {
      const s = useAppStore.getState().spoons;
      if (s < 3) return;
      try {
        const forecast = await getForecast();
        if (forecast.type === 'dip-ahead' && forecast.hour != null) {
          const key = `dip-${forecast.hour}`;
          if (deduped.has(key)) return;
          deduped.add(key);
          addNotification({
            source: 'spoon',
            title: 'Rest window ahead',
            body: forecast.message,
            icon: '🥄',
            priority: 'medium',
          });
        }
      } catch { /* best-effort */ }
    };

    check();
    const interval = window.setInterval(check, 10 * 60 * 1000);
    const onVisible = () => check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}
