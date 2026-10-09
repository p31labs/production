import { useEffect } from 'react';
import { useShellStore } from '../store/useShellStore';
import { executeCommand } from '../lib/commands';

export function useVerifyHooks() {
  useEffect(() => {
    if (import.meta.env.MODE !== 'production' || (typeof window !== 'undefined' && (window as any).__P31_VERIFY__)) {
      const sync = () => {
        (window as any).__p31_assistantMode = useShellStore.getState().assistantMode;
        (window as any).__p31_insights = { open: useShellStore.getState().insightsOpen };
      };
      sync();

      (window as any).__p31_pwa = {
        installed: window.matchMedia('(display-mode: standalone)').matches,
        swRegistered: false,
        updateReady: false,
        splash: true,
      };
      (window as any).__p31_haptics = { vibrate: true };
      (window as any).__p31_runCommand = (id: string, args?: Record<string, any>) => executeCommand(id, args);
      navigator.serviceWorker?.ready
        .then(() => { (window as any).__p31_pwa.swRegistered = true; })
        .catch(() => {});

      return useShellStore.subscribe(sync);
    }
  }, []);
}
