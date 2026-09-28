export interface EnvWorker {
  worker: string;
  secrets: string[];
  required: string[];
  missing: string[];
  error?: string;
}

export interface EnvList {
  scope: string;
  workerCount: number;
  errorCount: number;
  workers: EnvWorker[];
}

export interface EnvStatus {
  ts: string;
  totals: {
    workers: number;
    totalSecrets: number;
    missingRequiredCount: number;
    staleCount: number;
  };
  missingRequired: { worker: string; secret: string }[];
}

export interface AuditRow {
  id: string;
  key_id: string;
  action: string;
  actor: string;
  environment: string;
  worker_name: string | null;
  result: string;
  ts: number;
}

export interface AuditResponse {
  limit: number;
  rows: AuditRow[];
}

const PROXY = 'https://env-proxy.trimtab-signal.workers.dev';

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${PROXY}${path}`);
  if (!r.ok) throw new Error(`env-proxy ${r.status}`);
  return r.json() as Promise<T>;
}

export const fetchEnv = (scope: Scope) =>
  get<EnvList>(`/env/list?scope=${scope}`);
export const fetchStatus = () => get<EnvStatus>('/env/status');
export const fetchAudit = async (limit = 30) =>
  (await get<AuditResponse>(`/env/audit?limit=${limit}`)).rows;

export type Scope = 'all' | 'capital' | 'mcp';

export const SCOPE_LABELS: Record<Scope, string> = {
  all: 'All',
  capital: 'Capital Machine',
  mcp: 'MCP Gateways',
};