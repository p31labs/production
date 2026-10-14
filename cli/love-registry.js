// ═══════════════════════════════════════════════════════
// andromeda — LOVE Ledger MCP Server
// Exposes LOVE ledger state via MCP for agent consumption.
// ═══════════════════════════════════════════════════════

const { execFileSync } = require('child_process');

const LOVE_LEDGER_URL = process.env.LOVE_LEDGER_URL || 'https://love-ledger.p31ca.org';

function fetchJSON(url) {
  const script = [
    'const https=require("https"),http=require("http");',
    'const u=new URL(process.argv[1]);',
    'const mod=u.protocol==="https:"?https:http;',
    'mod.get(u,{timeout:8000},r=>{let d="";r.on("data",c=>d+=c);r.on("end",()=>process.stdout.write(d)})',
    '.on("error",()=>process.exit(1))'
  ].join('');
  try {
    const raw = execFileSync('node', ['-e', script, url], { timeout: 10000, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
    return JSON.parse(raw);
  } catch (e) {
    return { _error: `HTTP error: ${e.message}` };
  }
}

const TOOLS = [
  {
    name: 'love_status',
    description: 'Get LOVE ledger status — total LOVE, care_score, pools, vesting',
    inputSchema: { type: 'object', properties: { userId: { type: 'string', description: 'DID key or device ID' } } }
  },
  {
    name: 'love_balance',
    description: 'Get LOVE balance for a user',
    // NOTE: userId was previously declared with a malformed `required: true`
    // INSIDE the property object (invalid JSON Schema — the keyword belongs
    // at the object level). The handler already treats userId as optional
    // (falls back to P31_USER_ID then 'guest'), so the fix keeps it optional.
    // Filed: docs/fix-plans/love-registry-malformed-required-schema.md.
    inputSchema: { type: 'object', properties: { userId: { type: 'string' } } }
  },
  {
    name: 'love_sync',
    description: 'Sync local LOVE state with the cloud ledger',
    inputSchema: { type: 'object', properties: { userId: { type: 'string' } } }
  },
  {
    name: 'love_anchor',
    description: 'Anchor a LOVE ledger entry hash on-chain via P31TransparencyAnchor (Base Sepolia). Returns the broadcast tx hash.',
    inputSchema: {
      type: 'object',
      properties: {
        entryHash: { type: 'string', description: '0x-prefixed 32-byte hash of the ledger entry (from love_sync chain)' },
        uri: { type: 'string', description: 'Manifest URI (default: love-ledger chain query for userId)' }
      },
      required: ['entryHash']
    }
  }
];

function executeTool(name, args) {
  const userId = args.userId || process.env.P31_USER_ID || 'guest';
  switch (name) {
    // Endpoints target the DEPLOYED simple worker (apps/phos/src/workers/love-ledger),
    // which exposes /status, /balance, /chain, /export with a `?did=` query param
    // (NOT the undeployed monolith's /api/love/* routes).
    case 'love_status': {
      const url = `${LOVE_LEDGER_URL}/status?did=${encodeURIComponent(userId)}`;
      const result = fetchJSON(url);
      return result._error ? { error: result._error, status: 'error' } : { ...result, status: 'ok' };
    }
    case 'love_balance': {
      const url = `${LOVE_LEDGER_URL}/balance?did=${encodeURIComponent(userId)}`;
      const result = fetchJSON(url);
      return result._error ? { error: result._error, status: 'error' } : { balance: result, status: 'ok' };
    }
    case 'love_sync': {
      // The deployed worker has no /sync route; "sync local state with the cloud
      // ledger" maps to fetching the verified, court-admissible hash chain.
      const url = `${LOVE_LEDGER_URL}/chain?did=${encodeURIComponent(userId)}`;
      const result = fetchJSON(url);
      return result._error ? { error: result._error, status: 'error' } : { synced: true, chain: result, status: 'ok' };
    }
    case 'love_anchor': {
      // Anchor a LOVE ledger entry hash on-chain via the ledger-bridge.
      const entryHash = args.entryHash;
      if (!entryHash || !/^0x[0-9a-fA-F]{64}$/.test(entryHash)) {
        return { error: 'entryHash must be a 0x-prefixed 64-char hex string', status: 'error' };
      }
      const uri = args.uri || `https://love-ledger.p31ca.org/chain?did=${encodeURIComponent(userId)}`;
      const bridgeUrl = process.env.LEDGER_BRIDGE_URL || 'https://ledger-bridge.trimtab-signal.workers.dev';
      const script = [
        'const https=require("https");',
        'const d=JSON.stringify({entryHash:process.argv[1],uri:process.argv[2]});',
        'const o={hostname:new URL(process.argv[3]).hostname,path:"/anchor",method:"POST",headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(d)}};',
        'const r=https.request(o,res=>{let b="";res.on("data",c=>b+=c);res.on("end",()=>process.stdout.write(b))});',
        'r.on("error",e=>{process.stdout.write(JSON.stringify({error:String(e.message),status:"error"}))});',
        'r.write(d);r.end();'
      ].join('');
      try {
        const raw = execFileSync('node', ['-e', script, entryHash, uri, bridgeUrl], { timeout: 15000, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
        const parsed = JSON.parse(raw);
        return { ...parsed, status: parsed.ok ? 'ok' : 'error', explorer: `https://sepolia.basescan.org/tx/${parsed.txHash}` };
      } catch (e) {
        return { error: `Bridge error: ${e.message}`, status: 'error' };
      }
    }
    default:
      return { error: `Unknown tool: ${name}`, status: 'error' };
  }
}
// ─── JSON-RPC over stdio — SDK v2 (@modelcontextprotocol/server 2.3.1) ─────
// The hand-rolled stdio JSON-RPC loop was replaced by the v2 SDK's serveStdio
// entry (stdio subpath). Opening-era routing is the SDK's: modern stateless
// clients (2026-07-28) negotiate via server/discover with per-request `_meta`
// envelopes and get resultType/ttlMs/cacheScope on cacheable results; legacy
// clients (initialize/notifications/initialized, 2024-11-05..2025-11-25) are
// served a 2025-era instance from the same factory. See
// docs/fix-plans/love-registry-sdk-v2-remainder.md.
//
// Byte-identical tool surface: tools are registered from the TOOLS table
// above via fromJsonSchema, so tools/list emits exactly the hand-rolled
// inputSchema objects, and tool results keep the exact legacy payload shapes.

const { serveStdio } = require('@modelcontextprotocol/server/stdio');
const { McpServer, fromJsonSchema } = require('@modelcontextprotocol/server');

const SERVER_INFO = {"name":"p31-love-registry","version":"1.0.0"};
const TOOLS_LIST_TTL_MS = 300000;

function createServer() {
  const server = new McpServer(SERVER_INFO, {
    capabilities: { tools: {} },
    cacheHints: {
      'tools/list': { ttlMs: TOOLS_LIST_TTL_MS, cacheScope: 'public' },
    },
  });
  for (const tool of TOOLS) {
    server.registerTool(tool.name, {
      description: tool.description,
      inputSchema: fromJsonSchema(tool.inputSchema),
    }, async (args) => {
      try {
        const out = await executeTool(tool.name, args || {});
        return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] };
      } catch (e) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: e.message, status: 'error' }) }],
          isError: true,
        };
      }
    });
  }
  return server;
}

serveStdio(createServer);

process.stderr.write('[p31-love-registry] Server started. Listening on stdin (JSON-RPC).\n');
