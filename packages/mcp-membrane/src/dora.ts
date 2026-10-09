export const DORA_COLORS = {
  elite: '#22c55e',
  high: '#4d96ff',
  medium: '#f59e0b',
  low: '#ef4444',
} as const;

export function calculateDORAScore(metrics: {
  deploymentFrequency: number;
  changeFailureRate: number;
  meanTimeToRestore: number;
  leadTimeForChanges: number;
}): { score: number; label: string; color: string } {
  let score = 0;
  let count = 0;

  if (metrics.deploymentFrequency >= 1) { score += 5; count++; }
  else if (metrics.deploymentFrequency >= 0.5) { score += 4; count++; }
  else if (metrics.deploymentFrequency >= 0.1) { score += 3; count++; }
  else { score += 1; count++; }

  if (metrics.changeFailureRate <= 5) { score += 5; count++; }
  else if (metrics.changeFailureRate <= 10) { score += 4; count++; }
  else if (metrics.changeFailureRate <= 20) { score += 3; count++; }
  else { score += 1; count++; }

  if (metrics.meanTimeToRestore <= 1) { score += 5; count++; }
  else if (metrics.meanTimeToRestore <= 24) { score += 4; count++; }
  else if (metrics.meanTimeToRestore <= 168) { score += 3; count++; }
  else { score += 1; count++; }

  if (metrics.leadTimeForChanges <= 60) { score += 5; count++; }
  else if (metrics.leadTimeForChanges <= 1440) { score += 4; count++; }
  else if (metrics.leadTimeForChanges <= 10080) { score += 3; count++; }
  else { score += 1; count++; }

  const pct = count > 0 ? Math.round(score / (count * 5) * 100) : 0;
  if (pct >= 90) return { score: pct, label: 'Elite', color: DORA_COLORS.elite };
  if (pct >= 70) return { score: pct, label: 'High', color: DORA_COLORS.high };
  if (pct >= 50) return { score: pct, label: 'Medium', color: DORA_COLORS.medium };
  return { score: pct, label: 'Low', color: DORA_COLORS.low };
}
