export interface DispatchRequest {
  type: 'goal' | 'status' | 'health' | 'verify';
  passportId: string;
  sessionId?: string;
  goal?: string;
  mode?: string;
  autonomy?: string;
  payload?: Record<string, unknown>;
}

export interface DispatchResponse {
  ok: boolean;
  type: 'goal' | 'status' | 'health' | 'verify';
  passportId: string;
  result?: unknown;
  error?: string;
  deferred?: boolean;
  statusUrl?: string;
  cpuMsUsed?: number;
  subRequestsUsed?: number;
  verificationPassed?: boolean;
  auditIssues?: string[];
}

export interface PassportWorkerRequest {
  type: 'execute' | 'store' | 'recall' | 'identity' | 'preferences';
  passportId: string;
  sessionId?: string;
  data?: Record<string, unknown>;
}

export interface PassportWorkerResponse {
  ok: boolean;
  type: string;
  result?: unknown;
  error?: string;
}

export interface CustomLimits {
  cpuMs: number;
  subRequests: number;
}

export interface LimitCheck {
  allowed: boolean;
  cpuMsBudget: number;
  subRequestsBudget: number;
  cpuMsUsed: number;
  subRequestsUsed: number;
}
