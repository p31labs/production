export interface PassportRequest {
  type: 'execute' | 'store' | 'recall' | 'identity' | 'preferences' | 'build';
  passportId: string;
  sessionId?: string;
  goal?: string;
  mode?: string;
  autonomy?: string;
  buildId?: string;
  code?: string;
  filename?: string;
  data?: Record<string, unknown>;
}

export interface PassportResponse {
  ok: boolean;
  type: string;
  passportId?: string;
  buildId?: string;
  artifactKey?: string;
  result?: unknown;
  error?: string;
  sandboxId?: string;
  deferred?: boolean;
  statusUrl?: string;
}

export interface ExecuteInput {
  goal: string;
  mode: string;
  autonomy: string;
  sessionId: string;
}

export interface ExecuteBuildInput {
  buildId: string;
  code: string;
  filename: string;
}

export interface ExecuteBuildResult {
  ok: boolean;
  buildId: string;
  artifactKey?: string;
  error?: string;
}

export interface ExecuteResult {
  ok: boolean;
  sandboxId: string;
  result?: string;
  error?: string;
  deferred: boolean;
  statusUrl?: string;
}

export interface RecallResult {
  entries: MemoryRecord[];
  total: number;
}

export interface StoreResult {
  ok: boolean;
  key: string;
}

export interface IdentityRecord {
  passportId: string;
  did: string;
  name: string;
  avatar: string;
  accentHue: number;
  createdAt: number;
  verified: boolean;
  pickleName: string;
}

export interface PassportDOState {
  identities?: IdentityRecord[];
  preferences?: Record<string, unknown>;
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