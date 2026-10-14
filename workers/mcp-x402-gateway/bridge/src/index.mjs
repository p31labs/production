// HTTP edge for the bridge — exposes the 4 stdio MCP servers over MCP
// Streamable HTTP so the x402 Worker (L3.2) can bind to it. POST /mcp
// accepts a single JSON-RPC message (server/discover / tools/list /
// tools/call / notifications/*, plus the deprecated legacy initialize).
// GET /health reports backend health for the runbook.
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { BACKENDS } from './backends.mjs';
import { BridgeRouter, metaEnvelope } from './router.mjs';
import { verifyLoveSettlement } from './cbs-verify.mjs';

// ── E-2 usage counters (runbook §4 E-2) ──────────────────────────────────
// After a successful tools/call dispatch the bridge fire-and-forget POSTs
// {server, tool} to the registry POST /internal/usage with the internal
// secret header X-Internal-Usage-Key. Non-blocking by construction: the POST
// is never awaited, every failure is swallowed, and the tool response is
// flushed before the counter fires. When USAGE_INTERNAL_KEY is unset the
// counter stays off (skip silently, log once). The registry endpoint may not
// be deployed yet (POST 404s) — tool calls must be unaffected either way.
const USAGE_ENDPOINT =
  process.env.USAGE_ENDPOINT ?? 'https://mcp-registry.trimtab-signal.workers.dev/internal/usage';
const USAGE_INTERNAL_KEY = process.env.USAGE_INTERNAL_KEY ?? '';
let usageDisabledLogged = false;

function reportToolUsage(server, tool) {
  if (!USAGE_INTERNAL_KEY) {
    if (!usageDisabledLogged) {
      usageDisabledLogged = true;
      console.log('[bridge] USAGE_INTERNAL_KEY unset — usage counters disabled');
    }
    return;
  }
  fetch(USAGE_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Internal-Usage-Key': USAGE_INTERNAL_KEY },
    body: JSON.stringify({ server, tool }),
    signal: AbortSignal.timeout(2500),
  }).catch((e) => {
    console.warn(`[bridge] usage counter POST failed (non-blocking): ${e?.name ?? 'error'} ${e?.message ?? ''}${e?.cause?.message ? ` [cause: ${e.cause.message}]` : ''}`);
  });
}

export function createServer(router, { port = 8788 } = {}) {
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          tools: router.catalog.length,
          backends: router.backends.map((b) => ({ id: b.id, healthy: b.healthy })),
        }),
      );
      return;
    }
    if (req.method === 'POST' && req.url === '/mcp') {
      let body = '';
      for await (const c of req) body += c;
      let msg;
      try {
        msg = JSON.parse(body);
      } catch {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: null, _meta: metaEnvelope(), error: { code: -32700, message: 'parse error' } }));
        return;
      }
      // LOVE settlement enforcement (docs/specs/love-settlement-cbs.md §6):
      // when the gateway mints a signature, the bridge verifies BOTH CBS
      // challenges locally and consumes the nonce/coin at the ledger before
      // dispatch. Requests without the header (x402-paid, free tools) are
      // unchanged.
      const sigHeader = req.headers['x-love-signature'];
      if (typeof sigHeader === 'string' && sigHeader.length > 0) {
        const did = String(req.headers['x-did'] ?? '');
        const verdict = await verifyLoveSettlement(
          did,
          String(req.headers['x-love-settlement'] ?? ''),
          sigHeader,
        );
        if (!verdict.ok) {
          res.writeHead(403, { 'content-type': 'application/json' });
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id ?? null,
            error: { code: -32001, message: `Invalid LOVE settlement: ${verdict.reason}` },
          }));
          return;
        }
      }
      // MCP 2026-07-28 routable headers: gateways / WAFs / rate-limiters
      // can inspect these without parsing the JSON body.
      const respHeaders = { 'content-type': 'application/json' };
      if (msg.method) respHeaders['Mcp-Method'] = msg.method;
      if (msg.method === 'tools/call' && msg.params?.name) {
        respHeaders['Mcp-Name'] = msg.params.name;
      }
      try {
        const r = await router.handle(msg);
        if (r === null) {
          res.writeHead(202, respHeaders);
          res.end();
          return;
        }
        res.writeHead(200, respHeaders);
        res.end(JSON.stringify(r));
        // E-2: count successful tool dispatches. Fired after the response is
        // flushed; a failed/404ing POST can never affect the tool result.
        // server = the backend id that owns the tool (router.routeTable);
        // the registry /internal/usage contract is {server, tool}.
        if (msg.method === 'tools/call' && r && !r.error) {
          reportToolUsage(
            String(router.routeTable?.get(String(msg.params?.name ?? '')) ?? 'unknown'),
            String(msg.params?.name ?? ''),
          );
        }
      } catch (e) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id ?? null, _meta: metaEnvelope(), error: { code: -32603, message: String(e.message) } }));
      }
      return;
    }
    res.writeHead(404);
    res.end('not found');
  });
  server.port = port;
  return server;
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
  const router = new BridgeRouter(BACKENDS);
  await router.start();
  const server = createServer(router);
  server.listen(server.port, () => {
    const healthy = router.backends.filter((b) => b.healthy).map((b) => b.id);
    console.log(`[bridge] listening on :${server.port} | tools=${router.catalog.length} | backends=${healthy.join(',')}`);
  });
}
