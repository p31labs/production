export interface CheckResult {
  id: string; name: string; category: string;
  passed: boolean; message: string; details?: Record<string, unknown>;
  durationMs: number; timestamp: number;
}

export interface DeployRecord {
  id: string; familyId: string; site: string; version: string;
  startedAt: number; completedAt: number;
  checks: CheckResult[]; passedCount: number; totalCount: number;
  xpEarned: number; loveEarned: number;
  status: 'running' | 'passed' | 'failed' | 'partial';
}

export interface Achievement {
  id: string; name: string; description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlockedAt?: number;
}

export interface MembraneState {
  familyId: string;
  xp: number; love: number; level: number; streak: number;
  deployCount: number; cleanDeployCount: number;
  achievements: Achievement[];
  totalChecksPassed: number;
}

export interface DORAMetrics {
  deploymentFrequency: number;
  deploymentFrequencyLabel: string;
  leadTimeForChanges: number;
  leadTimeForChangesLabel: string;
  changeFailureRate: number;
  changeFailureRateLabel: string;
  meanTimeToRestore: number;
  meanTimeToRestoreLabel: string;
  overallScore: number;
  overallLabel: string;
  totalDeploys: number;
  cleanDeploys: number;
  deploysLast7Days: number;
  deploysLast30Days: number;
}

export interface DORAScorecard {
  metric: string;
  value: number | string;
  label: string;
  color: string;
  status: 'elite' | 'high' | 'medium' | 'low';
}
