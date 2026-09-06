import { useCallback } from 'react';
import { spawnConfetti } from '@p31/gamification/confetti';
import { haptic, isHapticEnabled } from '@p31/gamification/haptic';
import {
  playAchievementUnlock,
  playLoveChime,
  playQuestComplete,
  playSelectBlip,
  playReject,
} from '@p31/gamification/sound';
import { tierFromAge, type GrowthTier } from '@p31/gamification/growth-rings';
import { useAudioContext } from './useAudioContext';

const TIER_ICONS: Record<GrowthTier, string> = {
  seed: '🌱',
  sprout: '🌿',
  sapling: '🌳',
  canopy: '🌲',
  forest: '🛡️',
};

const TIER_LABELS: Record<GrowthTier, string> = {
  seed: 'Seed',
  sprout: 'Sprout',
  sapling: 'Sapling',
  canopy: 'Canopy',
  forest: 'Forest',
};

export interface ArcadeEffects {
  match: () => void;
  love: (amount: number) => void;
  celebrate: (count?: number) => void;
  complete: () => void;
  reject: () => void;
  growthTier: (age: number) => GrowthTier;
  tierIcon: (tier: GrowthTier) => string;
  tierLabel: (tier: GrowthTier) => string;
  isHapticEnabled: () => boolean;
}

export function useArcadeEffects(spoons: number): ArcadeEffects {
  const { ready: audioReady } = useAudioContext();
  const enabled = spoons >= 2 && audioReady;

  const match = useCallback(() => {
    if (!enabled) return;
    playSelectBlip(660);
    haptic.goodBond();
  }, [enabled]);

  const love = useCallback(
    (amount: number) => {
      if (!enabled) return;
      playLoveChime(amount);
      haptic.place();
    },
    [enabled],
  );

  const celebrate = useCallback(
    (count = 60) => {
      if (!enabled) return;
      spawnConfetti(count);
      playAchievementUnlock();
      haptic.achievement();
    },
    [enabled],
  );

  const complete = useCallback(() => {
    if (!enabled) return;
    spawnConfetti(80);
    playQuestComplete();
    haptic.complete();
  }, [enabled]);

  const reject = useCallback(() => {
    playReject();
    haptic.badBond();
  }, []);

  return {
    match,
    love,
    celebrate,
    complete,
    reject,
    growthTier: tierFromAge,
    tierIcon: (tier) => TIER_ICONS[tier],
    tierLabel: (tier) => TIER_LABELS[tier],
    isHapticEnabled,
  };
}
