import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSpoons } from './spoons';

export interface GamificationState {
  xp: number;
  xpNext: number;
  level: number;
  love: number;
  quest: number;
  questGoal: number;
  streak: number;
  crisisDismissed: boolean;

  placeComponent: (cost: number) => { success: boolean; spoonCost: number };
  completeQuest: () => void;
  addXP: (amount: number) => void;
  dismissCrisis: () => void;
  resetAfterRest: () => void;
}

/**
 * Gamification store — XP, LOVE, level, quest, streak.
 *
 * Spoons are NOT stored here. `useSpoons` is the single source of truth
 * for session energy. This store reads spoons on demand via
 * `useSpoons.getState()` and never holds a duplicate. Any consumer
 * that needs spoons reads from `useSpoons` directly.
 */
export const useGamification = create<GamificationState>()(
  persist(
    (set, get) => ({
      xp: 0,
      xpNext: 10,
      level: 1,
      love: 8,
      quest: 0,
      questGoal: 5,
      streak: 1,
      crisisDismissed: false,

      placeComponent: (cost: number) => {
        const current = useSpoons.getState().spoons;
        if (current < cost) {
          return { success: false, spoonCost: cost };
        }
        useSpoons.getState().setSpoons(current - cost);
        get().addXP(2);
        get().completeQuest();
        return { success: true, spoonCost: cost };
      },

      completeQuest: () => {
        const { quest, questGoal, level, streak } = get();
        const nextQuest = quest + 1;
        const leveled = nextQuest >= questGoal;
        set({
          quest: leveled ? 0 : nextQuest,
          level: leveled ? level + 1 : level,
          streak: streak + 1,
        });
        if (leveled) {
          const { spoons } = useSpoons.getState();
          useSpoons.getState().setSpoons(Math.min(3, spoons + 1));
        }
      },

      addXP: (amount: number) => {
        const { xp, xpNext, level, love } = get();
        const nextXp = xp + amount;
        const nextLove = love + Math.floor(amount / 3);
        if (nextXp >= xpNext) {
          set({
            xp: nextXp - xpNext,
            xpNext: Math.floor(xpNext * 1.5),
            level: level + 1,
            love: nextLove,
          });
        } else {
          set({ xp: nextXp, love: nextLove });
        }
      },

      dismissCrisis: () => set({ crisisDismissed: true }),

      resetAfterRest: () => {
        useSpoons.getState().setSpoons(2);
        set({ crisisDismissed: false });
      },
    }),
    {
      name: 'p31:gamification',
      partialize: (state) => ({
        xp: state.xp,
        xpNext: state.xpNext,
        level: state.level,
        love: state.love,
        quest: state.quest,
        streak: state.streak,
        crisisDismissed: state.crisisDismissed,
      }),
    },
  ),
);
