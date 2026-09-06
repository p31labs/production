export interface ConfigEntry {
  key: string;
  value: string;
  category: string;
  updated_at: number;
}

export interface ValidateResult {
  valid: boolean;
  message?: string;
}

export interface SaveResult {
  saved: number;
  updated_at: number;
}

export type ConfigCategory = 'rpc' | 'vault' | 'strategy' | 'feature' | 'api' | 'var';

export interface ConfigInput {
  value: string;
  category?: ConfigCategory;
  is_secret?: boolean;
}

let adminToken: string | null = null;

export function setAdminToken(token: string | null) {
  adminToken = token;
}

function apiUrl(path: string): string {
  return `/api/${path}`;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as { error?: string; message?: string }).error || (body as { message?: string }).message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const configApi = {
  async getConfig(): Promise<{ config: ConfigEntry[] }> {
    const res = await fetch(apiUrl('config'));
    return handle(res);
  },

  async saveConfig(input: Record<string, ConfigInput>): Promise<SaveResult> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
    const res = await fetch(apiUrl('config'), {
      method: 'PUT',
      headers,
      body: JSON.stringify(input),
    });
    return handle(res);
  },

  async validate(category: ConfigCategory, key: string, value: string): Promise<ValidateResult> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
    const res = await fetch(apiUrl('config/validate'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ category, key, value }),
    });
    return handle(res);
  },

  async getFlags(): Promise<{ flags: Record<string, boolean> }> {
    const res = await fetch(apiUrl('config/flags'));
    return handle(res);
  },
};
