import type { MembraneState, DeployRecord, DORAMetrics } from './types';

const MEMBRANE_URL = 'https://membrane-coordinator.trimtab-signal.workers.dev';

export class MembraneClient {
  private baseUrl: string;

  constructor(baseUrl = MEMBRANE_URL) {
    this.baseUrl = baseUrl;
  }

  async getState(): Promise<MembraneState> {
    const res = await fetch(`${this.baseUrl}/state`);
    if (!res.ok) throw new Error(`Membrane state error: ${res.status}`);
    return res.json();
  }

  async getHistory(limit = 20): Promise<DeployRecord[]> {
    const res = await fetch(`${this.baseUrl}/history?limit=${limit}`);
    if (!res.ok) throw new Error(`Membrane history error: ${res.status}`);
    const data = await res.json();
    return data.history || [];
  }

  async startDeploy(options: { familyId?: string; site: string; version: string; preview?: boolean }): Promise<string> {
    const res = await fetch(`${this.baseUrl}/deploy/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    if (!res.ok) throw new Error(`Deploy start error: ${res.status}`);
    const data = await res.json();
    return data.deployId;
  }

  async recordCheck(deployId: string, check: {
    id: string; name: string; category: string;
    passed: boolean; message: string; durationMs: number;
  }): Promise<{ xp: number; love: number }> {
    const res = await fetch(`${this.baseUrl}/deploy/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deployId, check }),
    });
    if (!res.ok) throw new Error(`Check record error: ${res.status}`);
    return res.json();
  }

  async completeDeploy(deployId: string): Promise<{ status: string; streak: number; xpEarned: number; loveEarned: number }> {
    const res = await fetch(`${this.baseUrl}/deploy/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deployId }),
    });
    if (!res.ok) throw new Error(`Deploy complete error: ${res.status}`);
    return res.json();
  }

  async getDORAMetrics(): Promise<DORAMetrics> {
    const [state, history] = await Promise.all([this.getState(), this.getHistory(50)]);
    return this.calculateDORAMetrics(state, history);
  }

  private calculateDORAMetrics(state: MembraneState, history: DeployRecord[]): DORAMetrics {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const deploysLast7Days = history.filter(d => d.completedAt >= sevenDaysAgo && d.completedAt > 0).length;
    const deploysLast30Days = history.filter(d => d.completedAt >= thirtyDaysAgo && d.completedAt > 0).length;

    const deploymentFrequency = deploysLast30Days / 30;
    const totalDeploying = history.filter(d => d.completedAt > 0).length;
    const failedDeploys = history.filter(d => d.status === 'failed' || d.status === 'partial').length;
    const changeFailureRate = totalDeploying > 0 ? (failedDeploys / totalDeploying) * 100 : 0;

    let meanTimeToRestore = 0;
    const failureRecoveries: number[] = [];
    for (let i = 0; i < history.length - 1; i++) {
      if (history[i].status === 'failed' || history[i].status === 'partial') {
        if (history[i + 1].status === 'passed' && history[i + 1].completedAt > history[i].completedAt) {
          failureRecoveries.push(history[i + 1].completedAt - history[i].completedAt);
        }
      }
    }
    if (failureRecoveries.length > 0) {
      meanTimeToRestore = failureRecoveries.reduce((a, b) => a + b, 0) / failureRecoveries.length;
    }

    const deploymentFrequencyLabel = deploymentFrequency >= 1 ? 'Elite' :
      deploymentFrequency >= 0.5 ? 'High' : deploymentFrequency >= 0.1 ? 'Medium' : 'Low';
    const changeFailureRateLabel = changeFailureRate <= 5 ? 'Elite' :
      changeFailureRate <= 10 ? 'High' : changeFailureRate <= 20 ? 'Medium' : 'Low';
    const mttrMs = meanTimeToRestore;
    const mttrHours = mttrMs / (1000 * 60 * 60);
    const leadTimeMinutes = 15;
    const leadTimeLabel = leadTimeMinutes <= 60 ? 'Elite' : leadTimeMinutes <= 24 * 60 ? 'High' :
      leadTimeMinutes <= 7 * 24 * 60 ? 'Medium' : 'Low';
    const mttrLabel = mttrHours <= 1 ? 'Elite' : mttrHours <= 24 ? 'High' : mttrHours <= 168 ? 'Medium' : 'Low';

    const scores: number[] = [];
    if (deploymentFrequency >= 1) scores.push(5); else if (deploymentFrequency >= 0.5) scores.push(4);
    else if (deploymentFrequency >= 0.1) scores.push(3); else scores.push(1);
    if (changeFailureRate <= 5) scores.push(5); else if (changeFailureRate <= 10) scores.push(4);
    else if (changeFailureRate <= 20) scores.push(3); else scores.push(1);
    if (mttrHours <= 1) scores.push(5); else if (mttrHours <= 24) scores.push(4);
    else if (mttrHours <= 168) scores.push(3); else scores.push(1);

    const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 20) : 0;
    const overallLabel = overallScore >= 90 ? 'Elite' : overallScore >= 70 ? 'High' : overallScore >= 50 ? 'Medium' : 'Low';

    return {
      deploymentFrequency: Math.round(deploymentFrequency * 100) / 100,
      deploymentFrequencyLabel,
      leadTimeForChanges: leadTimeMinutes,
      leadTimeForChangesLabel: leadTimeLabel,
      changeFailureRate: Math.round(changeFailureRate * 10) / 10,
      changeFailureRateLabel,
      meanTimeToRestore: Math.round(mttrHours * 10) / 10,
      meanTimeToRestoreLabel: mttrLabel,
      overallScore,
      overallLabel,
      totalDeploys: state.deployCount,
      cleanDeploys: state.cleanDeployCount,
      deploysLast7Days,
      deploysLast30Days,
    };
  }
}
