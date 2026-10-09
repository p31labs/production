import { findEndpointByUrl, fetchMCPTools, callMCPTool } from './mcpRegistry';

const LEGACY_URL = 'https://p31-design-mcp.trimtab-signal.workers.dev/';

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export async function listTools(endpointUrl?: string): Promise<MCPTool[]> {
  const url = endpointUrl || LEGACY_URL;
  const ep = findEndpointByUrl(url);
  if (ep) {
    const tools = await fetchMCPTools(ep.id);
    return (tools as MCPTool[]) ?? [];
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { result?: { tools?: MCPTool[] } };
    return body?.result?.tools ?? [];
  } catch {
    return [];
  }
}

export async function callTool(
  endpointUrl: string,
  name: string,
  arguments_: Record<string, unknown> = {},
): Promise<unknown> {
  const ep = findEndpointByUrl(endpointUrl);
  if (ep) return callMCPTool(ep.id, name, arguments_);
  const res = await fetch(endpointUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: arguments_ } }),
  });
  if (!res.ok) throw new Error(`MCP call ${name} failed (${res.status})`);
  const body = (await res.json()) as { result?: unknown; error?: unknown };
  if (body.error) throw new Error(JSON.stringify(body.error));
  return body.result;
}

export async function ping(url?: string): Promise<boolean> {
  try {
    const res = await fetch(url || LEGACY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping', params: {} }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
