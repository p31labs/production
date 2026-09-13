import { useWorkerStore } from './workerStore';
import { useSandboxStore } from '../sandbox/sandboxStore';

export type DelegationResult = { threadId: string; taskId: string };

export async function delegateGoal(
  passportId: string,
  goal: string,
): Promise<DelegationResult> {
  const worker = useWorkerStore.getState();
  const profile = worker.profiles[passportId];
  const autonomy = profile?.autonomy ?? 'advisory';

  const task = worker.queueTask(passportId, goal);
  worker.updateTask(passportId, task.id, { status: 'thinking' });

  const sandbox = useSandboxStore.getState();
  const thread = sandbox.createThread(goal);
  sandbox.setActiveThread(thread.id);

  if (autonomy !== 'advisory') {
    worker.updateTask(passportId, task.id, { status: 'working' });
    sandbox.setLastPrompt(goal);
  }

  worker.rememberKey(passportId, 'task-outcome', task.id, `delegated: ${goal}`);

  return { threadId: thread.id, taskId: task.id };
}
