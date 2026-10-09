// Tailscale API client — device discovery for P2P mesh
// Token provided by user at runtime; NEVER hardcoded in source.
// API token is stored in memory only (module-level variable). Never persisted to localStorage
// to avoid exposing secrets in persistent storage that could be read by other scripts or exfiltrated.

const API_BASE = 'https://api.tailscale.com/api/v2';

export interface TailscaleDevice {
  id: string;
  name: string;
  hostname: string;
  addresses: string[];
  os: string;
  clientVersion: string;
  lastSeen: string;
  online: boolean;
  tags: string[];
}

export interface TailscaleConfig {
  tailnet: string;
  apiToken: string;
}

let tailscaleConfig: TailscaleConfig | null = null;

export function getStoredTailscaleConfig(): TailscaleConfig | null {
  return tailscaleConfig;
}

export function storeTailscaleConfig(config: TailscaleConfig): void {
  tailscaleConfig = config;
}

export async function listTailscaleDevices(): Promise<TailscaleDevice[]> {
  const config = getStoredTailscaleConfig();
  if (!config) return [];

  try {
    const res = await fetch(`${API_BASE}/tailnet/${config.tailnet}/devices`, {
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { devices?: TailscaleDevice[] };
    return (body.devices ?? []).filter((d) => d.online);
  } catch {
    return [];
  }
}

export async function getTailscalePeerIPs(): Promise<string[]> {
  const devices = await listTailscaleDevices();
  return devices.flatMap((d) => d.addresses).filter((a) => a.startsWith('100.') && !a.includes(':'));
}

export function isTailscaleConfigured(): boolean {
  return !!getStoredTailscaleConfig();
}
