/**
 * @file hooks/useOutboxDrain.ts
 * Automatic outbox draining via Background Sync + visibilitychange fallback
 * 
 * - Background Sync API (Chrome/Edge): triggers on reconnect
 * - visibilitychange fallback (Firefox/Safari): drains when tab becomes visible + online
 * - online event: drains when network comes back
 */

import { useEffect } from 'react';
import { tryDrain } from '../lib/outbox';

export function useOutboxDrain() {
  useEffect(() => {
    // Background Sync registration (Chrome/Edge only)
    if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
      navigator.serviceWorker.ready
        .then((reg: any) => {
          if (reg.sync) {
            reg.sync.register('outbox-drain').catch((err: any) => {
              console.warn('[outbox] Background Sync registration failed:', err);
            });
          }
        })
        .catch(() => {});
    }

    // Listen for Background Sync messages from SW
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'outbox-drain') {
        console.log('[outbox] SW requested drain via Background Sync');
        tryDrain();
      }
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);

    // Fallback: drain on visibilitychange (tab becomes visible + online)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        console.log('[outbox] Tab visible + online, draining...');
        tryDrain();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Fallback: drain on online event (network reconnect)
    const onOnline = () => {
      console.log('[outbox] Network online, draining...');
      tryDrain();
    };
    window.addEventListener('online', onOnline);

    // Drain on mount if online
    if (navigator.onLine) {
      tryDrain();
    }

    return () => {
      navigator.serviceWorker?.removeEventListener('message', onMessage);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
    };
  }, []);
}
