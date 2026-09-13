import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loadMemory, saveMemory, remember } from './workerMemory';
import type { WorkerTask, WorkerMemoryEntry, WorkerProfile, WorkerAutonomy } from './types';

interface WorkerState {
  profiles: Record<string, WorkerProfile>;
  tasks: Record<string, WorkerTask[]>;
  memory: Record<string, WorkerMemoryEntry[]>;
  activePassportId: string | null;

  initWorker: (passportId: string, displayName: string) => void;
  queueTask: (passportId: string, prompt: string) => WorkerTask;
  updateTask: (passportId: string, taskId: string, patch: Partial<WorkerTask>) => void;
  setAutonomy: (passportId: string, autonomy: WorkerAutonomy) => void;
  recall: (passportId: string) => WorkerMemoryEntry[];
  rememberKey: (passportId: string, kind: WorkerMemoryEntry['kind'], key: string, value: string) => void;
}

function makeTask(prompt: string): WorkerTask {
  const now = Date.now();
  return {
    id: `task-${now}-${Math.random().toString(36).slice(2, 7)}`,
    prompt,
    status: 'queued',
    createdAt: now,
    updatedAt: now,
  };
}

export const useWorkerStore = create<WorkerState>()(
  persist(
    (set, get) => ({
      profiles: {},
      tasks: {},
      memory: {},
      activePassportId: null,

      initWorker: (passportId, displayName) => {
        if (get().profiles[passportId]) return;
        set((s) => ({
          profiles: {
            ...s.profiles,
            [passportId]: {
              passportId, displayName, createdAt: Date.now(),
              totalTasks: 0, totalArtifacts: 0, autonomy: 'advisory',
            },
          },
          tasks: { ...s.tasks, [passportId]: s.tasks[passportId] ?? [] },
          memory: { ...s.memory, [passportId]: loadMemory(passportId) },
        }));
      },

      queueTask: (passportId, prompt) => {
        const task = makeTask(prompt);
        set((s) => ({
          tasks: { ...s.tasks, [passportId]: [...(s.tasks[passportId] ?? []), task] },
          profiles: {
            ...s.profiles,
            [passportId]: {
              ...s.profiles[passportId],
              totalTasks: (s.profiles[passportId]?.totalTasks ?? 0) + 1,
            },
          },
        }));
        return task;
      },

      updateTask: (passportId, taskId, patch) =>
        set((s) => ({
          tasks: {
            ...s.tasks,
            [passportId]: (s.tasks[passportId] ?? []).map((t) =>
              t.id === taskId ? { ...t, ...patch, updatedAt: Date.now() } : t,
            ),
          },
        })),

      setAutonomy: (passportId, autonomy) =>
        set((s) => ({
          profiles: {
            ...s.profiles,
            [passportId]: { ...s.profiles[passportId], autonomy },
          },
        })),

      recall: (passportId) => get().memory[passportId] ?? [],

      rememberKey: (passportId, kind, key, value) =>
        set((s) => {
          const entries = remember(s.memory[passportId] ?? [], kind, key, value);
          saveMemory(passportId, entries);
          return { memory: { ...s.memory, [passportId]: entries } };
        }),
    }),
    {
      name: 'qpj:worker:state',
      partialize: (s) => ({ profiles: s.profiles, tasks: s.tasks }),
    },
  ),
);
