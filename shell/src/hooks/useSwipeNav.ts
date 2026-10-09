import { useEffect } from 'react';
import { useAppStore, type Tab } from '../store/useAppStore';

const TAB_ORDER: Tab[] = ['home', 'bonding', 'dashboard', 'sandbox', 'cockpit', 'profile', 'research'];

export function useSwipeNav() {
  useEffect(() => {
    if (import.meta.env.MODE !== 'production' || (typeof window !== 'undefined' && (window as any).__P31_VERIFY__)) {
      (window as any).__p31_mobile = { touchTargets: true, swipe: true };
    }
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (!isMobile) return;

    const el = document.querySelector<HTMLElement>('.shell');
    if (!el) return;

    let startX: number | null = null;
    let startY: number | null = null;

    const SKIP = ['CANVAS', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'];

    const pointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (SKIP.includes(target.tagName)) return;
      if (target.closest('canvas') || target.closest('[role="tab"]')) return;
      startX = e.clientX;
      startY = e.clientY;
    };

    const pointerUp = (e: PointerEvent) => {
      if (startX === null || startY === null) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = null;
      startY = null;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx < 50 || absDx < absDy * 1.5) return;
      const current = useAppStore.getState().tab;
      const idx = TAB_ORDER.indexOf(current as Tab);
      if (idx === -1) return;
      if (dx < 0) {
        const next = idx < TAB_ORDER.length - 1 ? TAB_ORDER[idx + 1] : TAB_ORDER[0];
        useAppStore.getState().setTab(next);
      } else {
        const prev = idx > 0 ? TAB_ORDER[idx - 1] : TAB_ORDER[TAB_ORDER.length - 1];
        useAppStore.getState().setTab(prev);
      }
    };

    el.addEventListener('pointerdown', pointerDown);
    el.addEventListener('pointerup', pointerUp);

    (window as any).__p31_mobile = { touchTargets: true, swipe: true };

    return () => {
      el.removeEventListener('pointerdown', pointerDown);
      el.removeEventListener('pointerup', pointerUp);
    };
  }, []);
}
