export interface PassportRequest {
  type: 'execute' | 'store' | 'recall' | 'identity' | 'preferences';
  passportId: string;
  sessionId?: string;
  goal?: string;
  data?: Record<string, unknown>;
}

export interface PassportResponse {
  ok: boolean;
  type: string;
  result?: unknown;
  error?: string;
  sandboxId?: string;
  deferred?: boolean;
  statusUrl?: string;
}

export interface TaskRecord {
  id: string;
  prompt: string;
  status: 'queued' | 'thinking' | 'working' | 'blocked' | 'done' | 'error';
  result?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MemoryRecord {
  id: string;
  kind: 'preference' | 'pattern' | 'artifact' | 'lesson' | 'task-outcome';
  key: string;
  value: string;
  createdAt: number;
  hitCount: number;
}
