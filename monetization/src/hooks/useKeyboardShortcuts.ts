import { useEffect } from 'react';
import { SECTIONS, type SectionId } from '../lib/nav';

interface ShortcutHandlers {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  onNavigate: (id: SectionId) => void;
}

/** ⌘K palette toggle, ⌘1–9 surface jumps, Escape closes overlays. */
export function useKeyboardShortcuts({ paletteOpen, setPaletteOpen, onNavigate }: ShortcutHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
        return;
      }

      if (mod && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const idx = Number(e.key) - 1;
        const section = SECTIONS[idx];
        if (section) onNavigate(section.id);
        return;
      }

      if (e.key === 'Escape') setPaletteOpen(false);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [paletteOpen, setPaletteOpen, onNavigate]);
}