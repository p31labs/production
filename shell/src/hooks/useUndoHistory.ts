import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useThemeStore } from '../store/useThemeStore';
import { usePanelStore } from '../store/usePanelStore';
import { useHistoryStore } from '../store/useHistoryStore';

export function useUndoHistory() {
  useEffect(() => {
    const unsubSpoons = useAppStore.subscribe((state, prev) => {
      if (useHistoryStore.getState().isUndoing || state.spoons === prev.spoons) return;
      useHistoryStore.getState().record('spoons', `Spoons ${prev.spoons} → ${state.spoons}`, () => {
        useAppStore.getState().setSpoons(prev.spoons);
      });
    });
    const unsubTheme = useThemeStore.subscribe((state, prev) => {
      if (useHistoryStore.getState().isUndoing) return;
      if (state.theme !== prev.theme) {
        useHistoryStore.getState().record('theme', `Theme → ${state.theme}`, () => {
          useThemeStore.getState().setTheme(prev.theme);
        });
      }
      if (state.age !== prev.age) {
        useHistoryStore.getState().record('age', `Age tier → ${state.age}`, () => {
          useThemeStore.getState().setAge(prev.age);
        });
      }
    });
    const unsubPanel = usePanelStore.subscribe((state, prev) => {
      if (useHistoryStore.getState().isUndoing) return;
      for (const id of Object.keys(state.panels)) {
        const a = prev.panels[id];
        const b = state.panels[id];
        if (a && b && a.collapsed !== b.collapsed) {
          useHistoryStore.getState().record('panel', `${b.title} ${b.collapsed ? 'collapsed' : 'expanded'}`, () => {
            usePanelStore.getState().setPanels(id, { collapsed: a.collapsed });
          });
          return;
        }
      }
    });
    return () => { unsubSpoons(); unsubTheme(); unsubPanel(); };
  }, []);
}
