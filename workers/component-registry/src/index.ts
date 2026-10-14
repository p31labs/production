/**
 * P31 Component Registry — Cloudflare Worker
 * Exposes the component registry over MCP over HTTP
 *
 * Endpoints:
 *   POST /mcp — MCP JSON-RPC endpoint (stateless 2026-07-28, SDK v2)
 *   GET /mcp — Endpoint metadata (stateless — no SSE)
 *   GET /health — Health check
 *   GET /components — List all components (simplified)
 *   GET /components/:name — Get component by name
 *   GET /tokens — Get all design tokens
 *
 * Deploy: npx wrangler deploy
 * Custom domain: registry.p31ca.org
 *
 * MCP transport: the hand-rolled stateless dispatch was replaced by the split
 * SDK v2 (`@modelcontextprotocol/server` → `McpServer` + `createMcpHandler`).
 * The SDK handler serves the modern 2026-07-28 surface (server/discover,
 * `_meta` envelope, resultType, ttlMs/cacheScope on cacheable results,
 * -32022 version mismatches) and keeps 2025-era clients working through its
 * default `legacy: 'stateless'` fallback (the initialize handshake) —
 * equivalent to the previous hand-rolled legacy-compat branch. See
 * docs/fix-plans/component-registry-sdk-v2-remainder.md.
 */

import { COMPONENTS, TOKEN_REFERENCE, TOOLS, executeTool } from './registry';
import { McpServer, createMcpHandler, fromJsonSchema } from '@modelcontextprotocol/server';

interface Env {
  // No bindings needed for basic registry
}

// ─── MCP 2026-07-28 (SDK v2) ───────────────────────────────────────────────

const PROTOCOL_VERSION = '2026-07-28';
const TOOLS_LIST_TTL_MS = 300000;

function buildServer(): McpServer {
  const server = new McpServer(
    { name: 'p31-component-registry', version: '1.0.0' },
    {
      capabilities: { tools: {} },
      cacheHints: { 'tools/list': { ttlMs: TOOLS_LIST_TTL_MS, cacheScope: 'public' } },
    },
  );
  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: fromJsonSchema(tool.inputSchema) },
      async (args) => {
        try {
          const result = executeTool(tool.name, (args ?? {}) as Record<string, unknown>);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        } catch (e: any) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: e?.message ?? String(e), status: 'error' }) }],
            isError: true,
          };
        }
      },
    );
  }
  return server;
}

/** The SDK handler does not add CORS headers — re-apply the worker's own. */
function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Mcp-Method, Mcp-Name, MCP-Protocol-Version');
  return new Response(res.body, { status: res.status, headers });
}

const mcpHandler = createMcpHandler(() => buildServer());

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // CORS headers for browser access
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Mcp-Method, Mcp-Name, MCP-Protocol-Version',
      'Content-Type': 'application/json',
    };

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (url.pathname === '/health' && method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          version: '1.0.0',
          components: COMPONENTS.length,
          tools: TOOLS.length,
          timestamp: new Date().toISOString(),
        }),
        { headers: corsHeaders }
      );
    }

    // Simplified components list (no MCP required)
    if (url.pathname === '/components' && method === 'GET') {
      return new Response(
        JSON.stringify({
          components: COMPONENTS.map(c => ({
            name: c.name,
            description: c.description,
            tokens: c.tokens,
          })),
          total: COMPONENTS.length,
        }),
        { headers: corsHeaders }
      );
    }

    // Get component by name
    if (url.pathname.startsWith('/components/') && method === 'GET') {
      const name = url.pathname.replace('/components/', '');
      const comp = COMPONENTS.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (!comp) {
        return new Response(
          JSON.stringify({ error: `Component "${name}" not found` }),
          { status: 404, headers: corsHeaders }
        );
      }
      return new Response(JSON.stringify({ component: comp, status: 'ok' }), { headers: corsHeaders });
    }

    // Get tokens
    if (url.pathname === '/tokens' && method === 'GET') {
      return new Response(JSON.stringify({ tokens: TOKEN_REFERENCE, status: 'ok' }), { headers: corsHeaders });
    }

    // Streamable HTTP: GET /mcp returns endpoint metadata (stateless — no SSE)
    if (url.pathname === '/mcp' && method === 'GET') {
      return new Response(
        JSON.stringify({
          service: 'p31-component-registry',
          transport: 'streamable-http',
          protocol: PROTOCOL_VERSION,
          mcp: 'POST /mcp',
          tools: TOOLS.map(t => t.name),
        }),
        { headers: corsHeaders }
      );
    }

    // Streamable HTTP: POST /mcp — served by the SDK v2 handler.
    if (url.pathname === '/mcp' && method === 'POST') {
      return withCors(await mcpHandler.fetch(request));
    }

    // 404 for unknown routes
    return new Response('Not found', { status: 404, headers: corsHeaders });
  },
};