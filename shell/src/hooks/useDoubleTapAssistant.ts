import { useEffect } from 'react';
import { useShellStore } from '../store/useShellStore';

export function useDoubleTapAssistant() {
  useEffect(() => {
    let lastTap = 0;
    let lastX = 0;
    let lastY = 0;

    const handler = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, input, select, textarea, a, [role="tab"], [role="button"]')) return;

      const now = Date.now();
      const dt = now - lastTap;
      const dx = Math.abs(e.clientX - lastX);
      const dy = Math.abs(e.clientY - lastY);

      if (lastTap > 0 && dt < 500 && dx < 40 && dy < 40) {
        const cur = useShellStore.getState().assistantOpen;
        useShellStore.getState().setAssistantOpen(!cur);
        lastTap = 0;
        return;
      }

      lastTap = now;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, []);
}
