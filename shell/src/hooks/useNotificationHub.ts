import { useEffect } from 'react';
import { useShellStore, type ShellNotification } from '../store/useShellStore';
import { useAppStore } from '../store/useAppStore';

/**
 * Module-level event funnel — callable from non-React modules (questEngine,
 * lovePayments, mesh, etc.). Mutes at zero spoons; addNotification still
 * honors per-source opt-ins. Returns the notification id, or null when muted.
 */
export function emitNotification(n: Omit<ShellNotification, 'id' | 'time' | 'read'>): string | null {
  if (useAppStore.getState().spoons === 0) return null;
  return useShellStore.getState().addNotification(n);
}

export function useNotificationHub() {
  const spoons = useAppStore((s) => s.spoons);

  useEffect(() => {
    const opts = useShellStore.getState().optIns;
    if (opts.system) {
      useShellStore.getState().addNotification({
        source: 'system',
        title: 'Shell ready',
        body: 'The sovereign layer is alive. Your surfaces load here.',
        icon: '🌿',
        priority: 'low',
      });
    }
     
  }, []);

  function emit(n: Omit<ShellNotification, 'id' | 'time' | 'read'>): void {
    emitNotification(n);
  }

  return { emit, muted: spoons === 0 };
}
