import { create } from 'zustand';
import { generateIdentity, loadIdentity, type SovereignIdentity } from './identity';

interface IdentityState {
  identity: SovereignIdentity | null;
  connecting: boolean;
  connect: () => Promise<SovereignIdentity>;
}

export const useIdentityStore = create<IdentityState>((set) => ({
  identity: loadIdentity(),
  connecting: false,
  connect: async () => {
    const existing = loadIdentity();
    if (existing) {
      set({ identity: existing });
      return existing;
    }
    set({ connecting: true });
    try {
      const identity = await generateIdentity();
      set({ identity });
      return identity;
    } finally {
      set({ connecting: false });
    }
  },
}));