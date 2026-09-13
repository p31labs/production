import { submitGoal, getSubstrateConfig, type SubstrateGoalResult } from '../../lib/substrate';
import { useWorkerStore } from './workerStore';

export interface BridgeOptions {
  mode?: string;
  autonomy?: string;
  sessionId?: string;
  cpuMs?: number;
  subRequests?: number;
}

export async function bridgeSubmitGoal(
  passportId: string,
  goal: string,
  opts: BridgeOptions = {},
): Promise<SubstrateGoalResult> {
  const config = getSubstrateConfig();

  if (!config.enabled) {
    return { ok: false, deferred: false, error: 'substrate disabled' };
  }

  const result = await submitGoal(passportId, goal, {
    mode: opts.mode,
    autonomy: opts.autonomy,
    sessionId: opts.sessionId,
    cpuMs: opts.cpuMs,
    subRequests: opts.subRequests,
  });

  if (result.ok && !result.deferred) {
    const worker = useWorkerStore.getState();
    const task = worker.queueTask(passportId, goal);
    worker.updateTask(passportId, task.id, { status: 'done', result: JSON.stringify(result.result) });
  }

  return result;
}
