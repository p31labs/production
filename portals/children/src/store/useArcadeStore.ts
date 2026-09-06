import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAppStore } from './useAppStore';

function mintMilestoneSBT(name: string, description: string): void {
  try {
    const { mintAchievementSBT } = useAppStore.getState();
    mintAchievementSBT(name, description);
  } catch (err) {
    console.warn('[Arcade] SBT mint failed', err);
  }
}

export interface ArcadeProgress {
  level: number;
  highScore: number;
  totalMatches: number;
}

export interface ArcadeState {
  jitterbug: ArcadeProgress;
  liquid: { highScore: number; patternsFound: number };
  cards: { decksUnlocked: number; pairsMatched: number };
  strategy: { missionsCompleted: number; wins: number };
  loveBalance: number;
  totalEarned: number;
  unlockedGames: string[];
  earnLove: (amount: number, game: string, reason?: string) => void;
  spendLove: (amount: number) => boolean;
  completeGame: (game: string, score: number) => void;
  unlockGame: (game: string) => void;
  reset: () => void;
}

const INITIAL = {
  jitterbug: { level: 1, highScore: 0, totalMatches: 0 },
  liquid: { highScore: 0, patternsFound: 0 },
  cards: { decksUnlocked: 1, pairsMatched: 0 },
  strategy: { missionsCompleted: 0, wins: 0 },
  loveBalance: 0,
  totalEarned: 0,
  unlockedGames: ['jitterbug'],
};

const UNLOCK_AT: Record<string, number> = { liquid: 10, cards: 25, strategy: 50 };

export const useArcadeStore = create<ArcadeState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      earnLove: (amount, game, reason) => {
        const state = get();
        const newBalance = state.loveBalance + amount;
        set({ loveBalance: newBalance, totalEarned: state.totalEarned + amount });

        const toUnlock = Object.entries(UNLOCK_AT)
          .filter(([id, at]) => newBalance >= at && !state.unlockedGames.includes(id))
          .map(([id]) => id);
        if (toUnlock.length) {
          set((s) => ({ unlockedGames: [...s.unlockedGames, ...toUnlock] }));
        }
        if (typeof (window as any).__P31_MINT_LOVE === 'function') {
          (window as any).__P31_MINT_LOVE(amount, reason || `Arcade: ${game}`);
        }
      },

      spendLove: (amount) => {
        if (get().loveBalance < amount) return false;
        set((s) => ({ loveBalance: s.loveBalance - amount }));
        return true;
      },

      completeGame: (game, score) => {
        const state = get();
        const updates: Partial<ArcadeState> = {};
        if (game === 'jitterbug') {
          const j = state.jitterbug;
          const newLevel = j.level + 1;
          updates.jitterbug = {
            level: newLevel,
            highScore: Math.max(j.highScore, score),
            totalMatches: j.totalMatches + 1,
          };
          get().earnLove(2, 'jitterbug', `Level ${newLevel} reached`);
          if (newLevel % 5 === 0) {
            mintMilestoneSBT(
              `Jitterbug Master (Level ${newLevel})`,
              `Reached level ${newLevel} in Jitterbug Puzzle`,
            );
          }
        } else if (game === 'liquid') {
          const l = state.liquid;
          const newPatterns = l.patternsFound + 1;
          updates.liquid = {
            highScore: Math.max(l.highScore, score),
            patternsFound: newPatterns,
          };
          if (newPatterns % 10 === 0) {
            mintMilestoneSBT(
              `Liquid Sculptor (${newPatterns} patterns)`,
              `Found ${newPatterns} wavefunction patterns in Liquid Sculptor`,
            );
          }
        } else if (game === 'cards') {
          const c = state.cards;
          const newPairs = c.pairsMatched + 1;
          updates.cards = {
            decksUnlocked: c.decksUnlocked + 1,
            pairsMatched: newPairs,
          };
          if (state.cards.pairsMatched > 0 && newPairs % 5 === 0) {
            get().earnLove(2, 'cards', 'Deck milestone');
            mintMilestoneSBT(
              `Quantum Cards (${newPairs} pairs)`,
              `Matched ${newPairs} entanglement pairs in Quantum Cards`,
            );
          }
        } else if (game === 'strategy') {
          const s = state.strategy;
          const newWins = s.wins + 1;
          updates.strategy = {
            missionsCompleted: s.missionsCompleted + 1,
            wins: newWins,
          };
          if (newWins % 3 === 0) {
            mintMilestoneSBT(
              `Strategy Commander (${newWins} wins)`,
              `Won ${newWins} SIC-POVM strategy missions`,
            );
          }
        }
        set(updates as Partial<ArcadeState>);
      },

      unlockGame: (game) => {
        set((s) => ({
          unlockedGames: s.unlockedGames.includes(game)
            ? s.unlockedGames
            : [...s.unlockedGames, game],
        }));
      },

      reset: () => {
        set(INITIAL);
        localStorage.removeItem('quantum-arcade-children');
      },
    }),
    { name: 'quantum-arcade-children' },
  ),
);
