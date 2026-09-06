import { useEffect } from 'react';
import { registerCognitiveWebMCPTools, registerArcadeWebMCPTools } from '../lib/registerTools';
import { useAppStore } from '../store/useAppStore';
import { useArcadeStore } from '../store/useArcadeStore';

declare global {
  interface Window {
    __P31_ARCADE_STATE__?: { loveBalance: number; gamesCompleted: number };
  }
}

export function useRegisterWebMCP(): void {
  useEffect(() => {
    registerCognitiveWebMCPTools();

    const app = useAppStore.getState;
    const arcade = useArcadeStore.getState;

    const gamesCompleted = () => arcade().unlockedGames.length;

    const syncArcadeWindow = () => {
      window.__P31_ARCADE_STATE__ = {
        loveBalance: arcade().loveBalance,
        gamesCompleted: gamesCompleted(),
      };
    };

    registerArcadeWebMCPTools({
      setSpoonLevel: (level) => app().setSpoons(level),
      getArcadeState: () => {
        syncArcadeWindow();
        return {
          loveBalance: arcade().loveBalance,
          gamesCompleted: gamesCompleted(),
          unlockedGames: [...arcade().unlockedGames],
        };
      },
      startGame: (game) => {
        const unlocked = arcade().unlockedGames.includes(game);
        if (unlocked) {
          const tabMap: Record<string, string> = { jitterbug: 'play', liquid: 'play', cards: 'play', strategy: 'play' };
          app().setTab((tabMap[game] ?? 'play') as never);
        }
        return unlocked;
      },
      mintLove: (amount, reason) => {
        app().mintLove('ARCADE_REWARD', { amount, reason });
        arcade().earnLove(amount, 'webmcp', reason);
      },
    });

    syncArcadeWindow();
  }, []);
}
