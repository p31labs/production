// Bridge router: fans out tools/list across all healthy backends to build
// a unified tool catalog + a {toolName -> backendId} route table, routes
// tools/call by name, and answers server/discover. Stateless at the HTTP edge;
// session pinning is handled upstream by the x402 Worker (L3.2).
//
// MCP 2026-07-28 stateless core: every response carries the namespaced _meta
// envelope (io.modelcontextprotocol/*) and resultType: 'complete' (SEP-2322);
// tools/list carries ttlMs + cacheScope (SEP-2549). The initialize branch
// below is DEPRECATED — kept because the deployed gateway worker, the
// stdio-client, and the 16/16 health gate still send initialize.
import { StdioBackend } from './stdio-client.mjs';

const PROTOCOL_VERSION = '2026-07-28';
const SERVER_INFO = { name: 'p31-mcp-x402-bridge', version: '0.1.0' };
const TOOLS_LIST_TTL_MS = 60_000;
const META_PROTOCOL = 'io.modelcontextprotocol/protocolVersion';
const META_SERVER_INFO = 'io.modelcontextprotocol/serverInfo';

function metaEnvelope() {
  return {
    [META_PROTOCOL]: PROTOCOL_VERSION,
    [META_SERVER_INFO]: SERVER_INFO,
  };
}

function mcpResult(id, result) {
  return { jsonrpc: '2.0', id, _meta: metaEnvelope(), result: { resultType: 'complete', ...result } };
}

function mcpError(id, code, message) {
  return { jsonrpc: '2.0', id, _meta: metaEnvelope(), error: { code, message } };
}

export { metaEnvelope };

export class BridgeRouter {
  constructor(backendConfigs) {
    this.backends = backendConfigs.map((c) => new StdioBackend(c));
    this.routeTable = new Map();
    this.catalog = [];
    this.ready = false;
  }

  async start() {
    await Promise.all(
      this.backends.map((b) =>
        b.probe().catch(() => {
          b.healthy = false;
        }),
      ),
    );
    for (const b of this.backends.filter((x) => x.healthy)) {
      for (const t of b.tools || []) {
        if (t && t.name) this.routeTable.set(t.name, b.id);
      }
    }
    this.catalog = this.backends.filter((b) => b.healthy).flatMap((b) => b.tools || []);
    this.ready = true;
  }

  stop() {
    for (const b of this.backends) b.stop();
  }

  async handle(msg) {
    const method = msg && msg.method;
    if (!method) return mcpError(msg?.id ?? null, -32600, 'no method');

    // server/discover — stateless capability negotiation (SEP-2575).
    if (method === 'server/discover') {
      return mcpResult(msg?.id ?? null, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
    }

    // ── Deprecated legacy-compat branch (pre-SEP-2575) ────────────────────
    // The deployed gateway worker, the stdio-client, and the 16/16 health
    // gate still send initialize. Keep the exact legacy shape below; do not
    // extend it. New clients negotiate via server/discover.
    if (method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          protocolVersion: '2026-07-28',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'p31-mcp-x402-bridge', version: '0.1.0' },
        },
      };
    }
    // ── End deprecated legacy-compat branch ───────────────────────────────

    if (method === 'tools/list') {
      return mcpResult(msg.id, { tools: this.catalog, ttlMs: TOOLS_LIST_TTL_MS, cacheScope: 'public' });
    }

    if (method === 'tools/call') {
      const name = msg.params?.name;
      const backendId = this.routeTable.get(name);
      if (!backendId) {
        return mcpError(msg.id, -32601, `unknown tool: ${name}`);
      }
      const backend = this.backends.find((b) => b.id === backendId);
      if (!backend || !backend.healthy) {
        return mcpError(msg.id, -32000, `backend ${backendId} unavailable`);
      }
      const r = await backend.request({ jsonrpc: '2.0', id: msg.id, method: 'tools/call', params: msg.params });
      if (r && r.error) {
        return { jsonrpc: '2.0', id: msg.id, _meta: metaEnvelope(), error: r.error };
      }
      return mcpResult(msg.id, r.result);
    }

    if (method.startsWith('notifications/')) {
      for (const b of this.backends.filter((x) => x.healthy)) {
        if (b.mode === 'stream' && b.child) b.child.stdin.write(JSON.stringify(msg) + '\n');
      }
      return null; // notifications expect no response
    }

    return mcpError(msg.id, -32601, `unsupported method: ${method}`);
  }
}