import { useEffect } from 'react';
import { useShellStore } from '../store/useShellStore';
import { useHistoryStore } from '../store/useHistoryStore';

export function useShellKeyboard() {
  const paletteOpen = useShellStore((s) => s.paletteOpen);
  const assistantOpen = useShellStore((s) => s.assistantOpen);
  const hubOpen = useShellStore((s) => s.hubOpen);
  const setPaletteOpen = useShellStore((s) => s.setPaletteOpen);
  const setAssistantOpen = useShellStore((s) => s.setAssistantOpen);
  const setHubOpen = useShellStore((s) => s.setHubOpen);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        useHistoryStore.getState().undo();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
        if (assistantOpen) setAssistantOpen(false);
        if (hubOpen) setHubOpen(false);
        return;
      }

      if (e.key === 'Escape') {
        if (paletteOpen) setPaletteOpen(false);
        if (assistantOpen) setAssistantOpen(false);
        if (hubOpen) setHubOpen(false);
        return;
      }

      if (e.altKey && e.key.toLowerCase() === 'a' && !typing) {
        e.preventDefault();
        setAssistantOpen(!assistantOpen);
        if (paletteOpen) setPaletteOpen(false);
        return;
      }

      if (e.altKey && e.key.toLowerCase() === 'n' && !typing) {
        e.preventDefault();
        setHubOpen(!hubOpen);
        if (paletteOpen) setPaletteOpen(false);
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [paletteOpen, assistantOpen, hubOpen, setPaletteOpen, setAssistantOpen, setHubOpen]);
}
