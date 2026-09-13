export type WorkerTaskStatus = 'queued' | 'thinking' | 'working' | 'blocked' | 'done' | 'error';

export type WorkerAutonomy = 'advisory' | 'assisted' | 'autonomous';

export interface WorkerTask {
  id: string;
  prompt: string;
  status: WorkerTaskStatus;
  createdAt: number;
  updatedAt: number;
  result?: string;
  artifactId?: string;
  error?: string;
}

export interface WorkerMemoryEntry {
  id: string;
  kind: 'preference' | 'pattern' | 'artifact' | 'lesson' | 'task-outcome';
  key: string;
  value: string;
  createdAt: number;
  hitCount: number;
}

export interface WorkerProfile {
  passportId: string;
  displayName: string;
  createdAt: number;
  totalTasks: number;
  totalArtifacts: number;
  autonomy: WorkerAutonomy;
}
