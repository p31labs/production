// usePanelStore.ts — fixed telemetry panel layout.
// Panels are static glass cards flanking the ship view: left rail + right rail.
// Only per-panel collapse state is user-mutable (persisted).
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DockZone = 'left' | 'right';

export interface PanelState {
  id: string;
  title: string;
  dock: DockZone;
  order: number;
  collapsed: boolean;
}

const DEFAULT_PANELS: Record<string, PanelState> = {
  spoon:  { id: 'spoon', title: 'Spoon Gauge', dock: 'left', order: 0, collapsed: false },
  larmor: { id: 'larmor', title: 'Larmor Engine', dock: 'left', order: 1, collapsed: true },
  node:   { id: 'node', title: 'Node Inspector', dock: 'left', order: 2, collapsed: true },
  care:   { id: 'care', title: 'Proof of Care', dock: 'right', order: 0, collapsed: false },
  ledger: { id: 'ledger', title: 'Sovereign Ledger', dock: 'right', order: 1, collapsed: false },
  centaur:{ id: 'centaur', title: 'Centaur Engine', dock: 'right', order: 2, collapsed: true },
};

interface PanelStore {
  panels: Record<string, PanelState>;
  setPanels: (id: string, partial: Partial<PanelState>) => void;
  resetPanels: () => void;
}

export const usePanelStore = create<PanelStore>()(
  persist(
    (set) => ({
      panels: { ...DEFAULT_PANELS },

      setPanels: (id, partial) => set((state) => ({
        panels: { ...state.panels, [id]: { ...state.panels[id], ...partial } },
      })),

      resetPanels: () => set({ panels: { ...DEFAULT_PANELS } }),
    }),
    { name: 'p31-panels-v2' }
  )
);
