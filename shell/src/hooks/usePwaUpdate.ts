/**
 * @file hooks/usePwaUpdate.ts
 * PWA service worker update detection and handling
 */

import { useEffect, useState, useCallback } from 'react';

const APPLIED_FLAG = 'p31-pwa-applied';

export function usePwaUpdate() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // If we just reloaded to apply an update, suppress the banner until a
    // genuinely new service worker installs.
    const justApplied = sessionStorage.getItem(APPLIED_FLAG);
    if (justApplied) sessionStorage.removeItem(APPLIED_FLAG);

    const onControllerChange = () => {
      if ((window as any).__P31_VERIFY__) return;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker.ready
      .then((reg) => {
        if (!justApplied && reg.waiting) {
          setUpdateReady(true);
          if ((window as any).__p31_pwa) (window as any).__p31_pwa.updateReady = true;
        }
        reg.onupdatefound = () => {
          const w = reg.installing;
          if (!w) return;
          w.onstatechange = () => {
            if (w.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateReady(true);
              if ((window as any).__p31_pwa) (window as any).__p31_pwa.updateReady = true;
            }
          };
        };
      })
      .catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const handleSwUpdate = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      sessionStorage.setItem(APPLIED_FLAG, String(Date.now()));
      let reloaded = false;
      const reload = () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      };
      if (reg.waiting) {
        navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        // Fallback: if the waiting worker never activates, force a reload.
        setTimeout(reload, 1500);
      } else {
        reload();
      }
    } catch {
      window.location.reload();
    }
  }, []);

  return { updateReady, handleSwUpdate };
}
