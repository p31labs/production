import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type HudSection = 'data' | 'larmor' | 'node' | 'system' | 'hardware' | null;

interface HudState {
  hudLeft: HudSection;
  hudRight: HudSection;
  setHudLeft: (section: HudSection) => void;
  setHudRight: (section: HudSection) => void;
}

export const useHudStore = create<HudState>()(
  persist(
    (set) => ({
      hudLeft: null,
      hudRight: null,
      setHudLeft: (section) => set({ hudLeft: section }),
      setHudRight: (section) => set({ hudRight: section }),
    }),
    { name: 'shell-hud-storage' }
  )
);
