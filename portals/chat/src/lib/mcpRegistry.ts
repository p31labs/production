export interface McpEndpoint {
  id: string;
  name: string;
  url: string;
  description: string;
  category?: 'design' | 'government' | 'finance' | 'crypto' | 'social' | 'local';
  tools?: Array<{ name: string; description: string; inputSchema?: unknown }>;
}

export const MCP_ENDPOINTS: McpEndpoint[] = [
  {
    id: 'p31-cli',
    name: 'P31 CLI',
    url: 'http://localhost:3100/mcp',
    description: 'Local CLI tools — phos-forge, identity, mesh, PQC, sovereign plugins',
    tools: [],
    category: 'local',
  },
  {
    id: 'sandbox', name: 'Sandbox Tools',
    url: 'https://design-mcp.trimtab-signal.workers.dev',
    description: 'Design MCP — 23 tools: token resolution, component generation, layout generation, icon search, UI auditing',
    category: 'design',
  },
  {
    id: 'justice', name: 'Sovereign Justice',
    url: 'https://p31-justice-hub.trimtab-signal.workers.dev/mcp',
    description: 'Justice Hub — 8 tools: evidence deposition (Ed25519+ML-DSA-65), escrow (2-of-3), ODR case/offer/resolve',
    category: 'government',
  },
  {
    id: 'marketplace', name: 'P31 Marketplace',
    url: 'https://marketplace-mcp.trimtab-signal.workers.dev/mcp',
    description: 'Marketplace MCP — 10 tools: list/search/offer/accept/escrow/dispute (SHA-256 evidence)',
    category: 'finance',
  },
  {
    id: 'wallet', name: 'Phenix Wallet',
    url: 'https://phenix-wallet-mcp.trimtab-signal.workers.dev/mcp',
    description: 'Phenix Wallet MCP — vault create/unlock/lock, credential store/present, recovery guardians',
    category: 'finance',
  },
  {
    id: 'crypto', name: 'PQC Crypto',
    url: 'https://p31-crypto-mcp.trimtab-signal.workers.dev/mcp',
    description: 'PQC Crypto MCP — 12 tools: ML-DSA-65 keygen/sign/verify, X-Wing KEM, SD-JWT, Taler, x402',
    category: 'crypto',
  },
  {
    id: 'bros', name: 'BROS Care',
    url: 'https://bros.trimtab-signal.workers.dev/mcp',
    description: 'BROS — 8 tools: persona switching (dad/sj/cj/wj), signaling rooms, care issuance, crisis pings',
    category: 'social',
  },
  {
    id: 'dads', name: 'DADS Trust Engine',
    url: 'https://dads.trimtab-signal.workers.dev/mcp',
    description: 'DADS — 7 tools: Incremental EigenTrust, task dispatch, LOVE minting (emotional 1.4× / self-care 1.3×)',
    category: 'social',
  },
  {
    id: 'roblox', name: 'Roblox Bridge',
    url: 'https://roblox-bridge.trimtab-signal.workers.dev/mcp',
    description: 'Roblox bridge — 14 tools: create, deploy, terrain, worlds, skin',
    category: 'social',
  },
];

let cachedTools: Map<string, Array<{ name: string; description: string }>> | null = null;

export async function fetchMCPTools(serverId: string): Promise<Array<{ name: string; description: string }> | null> {
  const ep = MCP_ENDPOINTS.find((e) => e.id === serverId);
  if (!ep) return null;

  try {
    const res = await fetch(ep.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { result?: { tools?: Array<{ name: string; description: string }> } };
    return body?.result?.tools ?? null;
  } catch {
    return null;
  }
}

export async function callMCPTool(
  serverId: string,
  toolName: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  const ep = MCP_ENDPOINTS.find((e) => e.id === serverId);
  if (!ep) throw new Error(`Unknown MCP server: ${serverId}`);

  const res = await fetch(ep.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    }),
  });
  if (!res.ok) throw new Error(`MCP call ${toolName} failed (${res.status})`);
  const body = (await res.json()) as { result?: unknown; error?: unknown };
  if (body.error) throw new Error(JSON.stringify(body.error));
  return body.result;
}

export function findEndpointByUrl(url: string): McpEndpoint | undefined {
  const norm = (u: string) => u.replace(/\/+$/, '').toLowerCase();
  const n = norm(url);
  return MCP_ENDPOINTS.find((e) => norm(e.url) === n);
}

export function getCachedTools(): Map<string, Array<{ name: string; description: string }>> | null {
  return cachedTools;
}

export async function preloadAllToolLists(): Promise<void> {
  if (cachedTools) return;
  cachedTools = new Map();
  await Promise.allSettled(
    MCP_ENDPOINTS.map(async (ep) => {
      const tools = await fetchMCPTools(ep.id);
      if (tools) cachedTools!.set(ep.id, tools);
    }),
  );
}

// ─── Tool call event emitter ───
export type ToolCallStatus = 'pending' | 'running' | 'done' | 'error';

export interface ToolCallEvent {
  id: string;
  toolName: string;
  serverId: string;
  args: Record<string, unknown>;
  status: ToolCallStatus;
  result?: unknown;
  error?: string;
  startedAt: number;
  endedAt?: number;
}

type ToolSubscriber = (event: ToolCallEvent) => void;
const toolSubscribers = new Set<ToolSubscriber>();

export function subscribeToolCalls(fn: ToolSubscriber): () => void {
  toolSubscribers.add(fn);
  return () => toolSubscribers.delete(fn);
}

function emitToolCall(event: ToolCallEvent) {
  for (const fn of toolSubscribers) fn(event);
}

let _toolCallSeq = 0;

export async function callMCPToolWithEvents(
  serverId: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const id = `tc-${Date.now()}-${_toolCallSeq++}`;
  const event: ToolCallEvent = { id, toolName, serverId, args, status: 'pending', startedAt: Date.now() };
  emitToolCall(event);

  event.status = 'running';
  emitToolCall(event);

  try {
    const result = await callMCPTool(serverId, toolName, args);
    event.status = 'done';
    event.result = result;
    event.endedAt = Date.now();
    emitToolCall(event);
    return result;
  } catch (e) {
    event.status = 'error';
    event.error = String(e);
    event.endedAt = Date.now();
    emitToolCall(event);
    throw e;
  }
}
