export type WorkshopLevel = 0 | 1 | 2 | 3 | 4;

export type TabId = 'hub' | 'studio' | 'tokens' | 'recipes' | 'components' | 'playground' | 'brands' | 'contrast';

export interface WorkshopLevelDef {
  level: WorkshopLevel;
  name: string;
  tabs: TabId[];
  unlockCheck: (state: WorkshopProgressState) => boolean;
  progressLabel: string;
}

export interface WorkshopProgressState {
  artifactsBuilt: number;
  tokensUsed: number;
  sbtsMinted: number;
  buildsCompleted: number;
}

export const WORKSHOP_LEVELS: WorkshopLevelDef[] = [
  {
    level: 0,
    name: 'Seed',
    tabs: ['hub', 'studio'],
    unlockCheck: () => true,
    progressLabel: 'Level 0 — Seed',
  },
  {
    level: 1,
    name: 'Sprout',
    tabs: ['hub', 'studio', 'tokens'],
    unlockCheck: (s) => s.artifactsBuilt >= 1,
    progressLabel: 'Build and deploy 1 artifact',
  },
  {
    level: 2,
    name: 'Root',
    tabs: ['hub', 'studio', 'tokens', 'recipes'],
    unlockCheck: (s) => s.artifactsBuilt >= 3,
    progressLabel: 'Complete 3 studio builds',
  },
  {
    level: 3,
    name: 'Bloom',
    tabs: ['hub', 'studio', 'tokens', 'recipes', 'components', 'playground'],
    unlockCheck: (s) => s.artifactsBuilt >= 5 && s.tokensUsed >= 1,
    progressLabel: '5 artifacts + use tokens once',
  },
  {
    level: 4,
    name: 'Full',
    tabs: ['hub', 'studio', 'tokens', 'recipes', 'components', 'playground', 'brands', 'contrast'],
    unlockCheck: (s) => s.artifactsBuilt >= 10 && s.sbtsMinted >= 1,
    progressLabel: '10 artifacts + earn a badge',
  },
];

export function getVisibleTabs(level: WorkshopLevel): Array<'studio' | 'tokens' | 'recipes' | 'components' | 'playground' | 'brands' | 'contrast'> {
  return WORKSHOP_LEVELS[level]?.tabs ?? ['studio'];
}

export function getUnlockHint(level: WorkshopLevel): string | null {
  if (level >= 4) return null;
  const next = WORKSHOP_LEVELS[level + 1];
  return next?.progressLabel ?? null;
}

export function getLevelLabel(level: WorkshopLevel): string {
  return WORKSHOP_LEVELS[level]?.name ?? 'Seed';
}

export function getLevelName(level: WorkshopLevel): string {
  return WORKSHOP_LEVELS[level]?.progressLabel ?? `Level ${level}`;
}

export function advanceLevel(
  currentLevel: WorkshopLevel,
  progress: WorkshopProgressState,
): WorkshopLevel {
  let level = currentLevel;
  for (const def of WORKSHOP_LEVELS) {
    if (def.level <= level) continue;
    if (def.unlockCheck(progress)) {
      level = def.level as WorkshopLevel;
    }
  }
  return level;
}

export function getProgressForLevel(
  level: WorkshopLevel,
  progress: WorkshopProgressState,
): { current: number; target: number; label: string } {
  const next = WORKSHOP_LEVELS[level + 1];
  if (!next) return { current: 1, target: 1, label: 'Max level' };

  const target = 1;
  let current = 1;

  if (next.progressLabel.includes('artifact')) {
    current = Math.min(progress.artifactsBuilt, target);
  } else if (next.progressLabel.includes('tokens')) {
    current = Math.min(progress.tokensUsed, target);
  } else if (next.progressLabel.includes('badge') || next.progressLabel.includes('SBT')) {
    current = Math.min(progress.sbtsMinted, target);
  }

  return { current, target, label: next.progressLabel };
}
