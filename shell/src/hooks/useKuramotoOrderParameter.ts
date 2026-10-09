import { useSyncExternalStore, useMemo } from 'react';
import { useShellStore } from '../store/useShellStore';

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const UPDATE_INTERVAL_MS = 30_000; // 30 seconds

const NO_HISTORY: Array<{ ts: number; type: 'command' | 'panel' | 'error' }> = [];

function useCommandHistory(): Array<{ ts: number; type: 'command' | 'panel' | 'error' }> {
  const history = useShellStore((s) => (s as any).commandHistory ?? NO_HISTORY);
  return history;
}

export function useKuramotoOrderParameter(): { r: number; phase: 'low' | 'mid' | 'full'; mode: 'wye' | 'delta' } {
  const history = useCommandHistory();

  const subscribe = (onChange: () => void) => {
    const iv = setInterval(() => {
      const now = Date.now();
      const windowStart = now - WINDOW_MS;
      const recent = history.filter((e) => e.ts >= windowStart);
      const total = recent.length;
      if (total === 0) {
        (window as any).__p31_kura = { r: 0, total: 0, commands: 0, panels: 0, errors: 0, ts: now };
        onChange();
        return;
      }
      const commands = recent.filter((e) => e.type === 'command').length;
      const panels = recent.filter((e) => e.type === 'panel').length;
      const errors = recent.filter((e) => e.type === 'error').length;
      const variance = (commands / total) * Math.pow(commands / total, 2) +
                       (panels / total) * Math.pow(panels / total, 2) +
                       (errors / total) * Math.pow(errors / total, 2);
      const next = Math.max(0, Math.min(1, 1 - variance / 3));
      (window as any).__p31_kura = { r: next, total, commands, panels, errors, ts: now };
      onChange();
    }, UPDATE_INTERVAL_MS);
    return () => clearInterval(iv);
  };

  const getSnapshot = () => history;

  const historyForRender = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const r = useMemo(() => {
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    const recent = historyForRender.filter((e) => e.ts >= windowStart);
    const total = recent.length;
    if (total === 0) return 0;
    const commands = recent.filter((e) => e.type === 'command').length;
    const panels = recent.filter((e) => e.type === 'panel').length;
    const errors = recent.filter((e) => e.type === 'error').length;
    const variance = (commands / total) * Math.pow(commands / total, 2) +
                     (panels / total) * Math.pow(panels / total, 2) +
                     (errors / total) * Math.pow(errors / total, 2);
    return Math.max(0, Math.min(1, 1 - variance / 3));
  }, [historyForRender]);

  const phase = r > 0.7 ? 'full' : r > 0.4 ? 'mid' : 'low';
  const mode = r > 0.7 ? 'wye' : 'delta';

  return { r, phase, mode };
}
