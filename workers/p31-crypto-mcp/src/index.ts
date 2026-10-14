/**
 * p31-crypto-mcp — Post-Quantum Crypto MCP Wrapper (Streamable HTTP)
 *
 * ⚠️ DEMO SHIM — INTERFACE SCAFFOLD ONLY. NOT A CRYPTO SERVICE.
 *
 * The tools below return synthetic/placeholder values. They do NOT perform
 * real cryptography and MUST NOT be cited as evidence of NIST/FIPS compliance.
 * `pqc_verify` does not verify; `pqc_audit` does not audit.
 *
 * The REAL, tested post-quantum primitives live in:
 *   - packages/sovereign-primitives/src/postQuantum.ts  (ML-KEM-768, ML-DSA-65, SLH-DSA-128s)
 *   - packages/sovereign-primitives/src/composite.ts     (Ed25519 + ML-DSA-65 composite)
 *   - workers/ledger-bridge/src/sdjwt.ts                 (ML-DSA-65 SD-JWT signing)
 *   - workers/federation-bridge/src/index.ts             (ML-DSA-65 verification)
 *
 * TODO(crypto-mcp): wire these tools to the real primitives (delegate to
 * ledger-bridge / federation-bridge). Until then, `demoShim: true` is returned
 * on every response.
 *
 * Implements Streamable HTTP per the MCP 2026-07-28 STATELESS protocol
 * (SEP-2575/2322/2549/2243/2567) — the protocol version claimed in
 * smithery.yaml. No initialize handshake on the main path; a deprecated
 * legacy-compat branch still serves 2025-era clients.
 *   POST /mcp — JSON-RPC 2.0
 */

export interface Env {
  LEDGER_BRIDGE_URL: string;
  FEDERATION_BRIDGE_URL: string;
  TALER_BRIDGE_URL: string;
  X402_GATEWAY_URL: string;
  /** OAuth 2.1 resource-server (RFC 8707). Optional — when unset, bearer validation is disabled and the server stays open (runbook §6). */
  OAUTH_JWKS_URL?: string;
  /** RFC 9207 expected token issuer (optional; falls back to the JWKS URL origin). */
  OAUTH_ISSUER?: string;
  /** RFC 8707 resource URI that a bearer token's `aud` claim MUST match. */
  RESOURCE_ID?: string;
}

import { McpServer, createMcpHandler, fromJsonSchema } from '@modelcontextprotocol/server';

function id(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
}

function cors(body: string, status = 200): Response {
  return new Response(body, { status, headers: {
    'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type',
  }});
}

// ───────────────────────────────────────────────────────────────────────
// OAuth 2.1 resource-server (RFC 8707 audience binding + RFC 9207 `iss`).
// Ported from workers/p31-capital-machine-mcp/src/index.ts (fleet
// reference, 2026-10-12 wave). WebCrypto only (RS256/ES256/Ed25519), zero
// new dependencies, 15-minute JWKS cache. Active only when
// OAUTH_JWKS_URL is configured (env opt-in): any supplied
// `Authorization: Bearer` token then MUST validate (alg/kid/signature/exp,
// aud == RESOURCE_ID, iss == fleet AS issuer) or the call is rejected with
// HTTP 401 — never silently ignored. Without a Bearer header, behavior is
// unchanged: public tool discovery stays open (runbook §6 do-nots).
// ───────────────────────────────────────────────────────────────────────

const OAUTH_AS_ISSUER = 'https://oauth-relay.trimtab-signal.workers.dev';
const OAUTH_AS_JWKS_URL = 'https://oauth-relay.trimtab-signal.workers.dev/.well-known/jwks.json';
const RESOURCE_URI = 'https://p31-crypto-mcp.trimtab-signal.workers.dev/mcp';
const JWKS_CACHE_TTL_MS = 15 * 60 * 1000;

let jwksCache: { source: string; fetchedAt: number; keys: Record<string, JsonWebKey> } | null = null;

/** Base64url → base64, then decode to a string. */
function b64urlDecode(s: string): string {
  const base64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  return atob(base64);
}

/** Base64url → bytes. */
function b64urlToBytes(s: string): Uint8Array {
  const binary = b64urlDecode(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Decode (without verifying) a JWT into header + payload. Returns null on malformed input. */
function decodeJwt(token: string): { header: { kid?: string; alg?: string }; payload: Record<string, unknown> } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(b64urlDecode(parts[0])) as { kid?: string; alg?: string };
    const payload = JSON.parse(b64urlDecode(parts[1])) as Record<string, unknown>;
    if (!header || typeof header !== 'object' || !payload || typeof payload !== 'object') return null;
    return { header, payload };
  } catch {
    return null;
  }
}

/** Fetch (with 15-min module-level cache) the JWKS for the fleet AS, keyed by kid. */
async function fetchJwksKeys(source: string): Promise<Record<string, JsonWebKey>> {
  const now = Date.now();
  if (jwksCache && jwksCache.source === source && now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
    return jwksCache.keys;
  }
  const res = await fetch(source);
  if (!res.ok) return {};
  const body = (await res.json().catch(() => ({}))) as { keys?: unknown[] };
  const keys: Record<string, JsonWebKey> = {};
  for (const raw of body.keys ?? []) {
    const jwk = raw as JsonWebKey & { kid?: string };
    if (jwk && typeof jwk.kid === 'string') keys[jwk.kid] = jwk;
  }
  jwksCache = { source, fetchedAt: now, keys };
  return keys;
}

/** WebCrypto algorithm descriptor for a supported JWS alg. */
function webAlg(jwk: JsonWebKey, alg: string): { name: string; hash?: string; namedCurve?: string } {
  if (alg === 'ES256') return { name: 'ECDSA', namedCurve: (jwk.crv as string) || 'P-256' };
  if (alg === 'Ed25519') return { name: 'Ed25519' };
  return { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
}

/** Verify a JWS signature over `signedData` with WebCrypto. Never throws. */
async function verifySignature(jwk: JsonWebKey, alg: string, signedData: Uint8Array, signature: Uint8Array): Promise<boolean> {
  const algSpec = webAlg(jwk, alg);
  try {
    const key = await crypto.subtle.importKey('jwk', jwk, algSpec as any, false, ['verify']);
    return await crypto.subtle.verify(algSpec as any, key, signature, signedData);
  } catch {
    return false;
  }
}

/**
 * Validate an RFC 8707-bound OAuth 2.1 bearer token.
 * Returns { sub, scope? } on success, or null when:
 *  - no Bearer header present,
 *  - OAUTH_JWKS_URL / RESOURCE_ID unset,
 *  - token malformed, unknown alg/kid, bad signature, expired,
 *  - `aud` ≠ RESOURCE_ID (RFC 8707), or
 *  - `iss` ≠ OAUTH_ISSUER / issuer derived from the JWKS URL (RFC 9207 mix-up defense).
 * All wrapped in try/catch — never throws.
 */
async function verifyOAuthBearer(request: Request, env: Env): Promise<{ sub: string; scope?: string } | null> {
  try {
    const auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) return null;
    const token = auth.slice(7).trim();
    if (!token || !env.OAUTH_JWKS_URL || !env.RESOURCE_ID) return null;

    const decoded = decodeJwt(token);
    if (!decoded) return null;

    const alg = decoded.header.alg ?? '';
    if (alg !== 'RS256' && alg !== 'ES256' && alg !== 'Ed25519') return null;
    const kid = decoded.header.kid;
    if (!kid) return null;

    const keys = await fetchJwksKeys(env.OAUTH_JWKS_URL);
    const jwk = keys[kid];
    if (!jwk) return null;

    const parts = token.split('.');
    const signedData = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = b64urlToBytes(parts[2]);
    if (!(await verifySignature(jwk, alg, signedData, signature))) return null;

    const payload = decoded.payload;
    const exp = payload.exp;
    if (typeof exp !== 'number' || exp <= Math.floor(Date.now() / 1000)) return null;

    // RFC 8707: the token's audience MUST be bound to our resource.
    const aud = payload.aud;
    const audOk = Array.isArray(aud) ? aud.includes(env.RESOURCE_ID) : aud === env.RESOURCE_ID;
    if (!audOk) return null;

    // RFC 9207: the token's issuer MUST match the fleet AS (explicit
    // OAUTH_ISSUER wins; otherwise derive from the JWKS URL origin).
    const iss = payload.iss;
    const expectedIssuer = env.OAUTH_ISSUER ?? issuerFromJwks(env.OAUTH_JWKS_URL) ?? null;
    if (typeof iss !== 'string' || !expectedIssuer || iss !== expectedIssuer) return null;

    return { sub: String(payload.sub ?? ''), scope: typeof payload.scope === 'string' ? payload.scope : undefined };
  } catch {
    return null;
  }
}

/** Derive the IdP issuer (origin) from a JWKS URL, or null. */
function issuerFromJwks(jwksUrl: string): string | null {
  try {
    return new URL(jwksUrl).origin;
  } catch {
    return null;
  }
}

/** RFC 8414 authorization-server metadata — points at the fleet AS (oauth-relay). */
function oauthAsMetadata(resource: string): Record<string, unknown> {
  return {
    issuer: OAUTH_AS_ISSUER,
    authorization_endpoint: `${OAUTH_AS_ISSUER}/authorize`,
    token_endpoint: `${OAUTH_AS_ISSUER}/token`,
    jwks_uri: OAUTH_AS_JWKS_URL,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
    authorization_response_iss_parameter_supported: true,
    resource,
  };
}

/** RFC 9728 protected-resource metadata for this resource server. */
function protectedResourceMetadata(env: Env, resource: string, scopes: string[]): Record<string, unknown> {
  return {
    resource: env.RESOURCE_ID ?? resource,
    authorization_servers: [OAUTH_AS_ISSUER],
    scopes_supported: scopes,
  };
}

const TOOLS = [
  { name: 'pqc_keygen', description: 'Generate ML-DSA-65 + Ed25519 hybrid keypair for post-quantum signing.',
    inputSchema: { type: 'object', properties: { didMethod: { type: 'string', enum: ['key','jwk'] } } } },
  { name: 'pqc_sign', description: 'Sign data with ML-DSA-65 + Ed25519 composite signature (defense-in-depth).',
    inputSchema: { type: 'object', properties: { data: { type: 'string' }, did: { type: 'string' } }, required: ['data','did'] } },
  { name: 'pqc_verify', description: 'Verify ML-DSA-65 + Ed25519 composite signature.',
    inputSchema: { type: 'object', properties: { data: { type: 'string' }, signature: { type: 'string' }, did: { type: 'string' } }, required: ['data','signature','did'] } },
  { name: 'kem_encapsulate', description: 'X-Wing KEM: ML-KEM-768 (FIPS 203) + X25519 hybrid encapsulate.',
    inputSchema: { type: 'object', properties: { recipientPublicKeyHex: { type: 'string' }, contextLabel: { type: 'string' } }, required: ['recipientPublicKeyHex'] } },
  { name: 'kem_decapsulate', description: 'X-Wing KEM: ML-KEM-768 + X25519 hybrid decapsulate.',
    inputSchema: { type: 'object', properties: { ciphertext: { type: 'string' }, contextLabel: { type: 'string' } }, required: ['ciphertext'] } },
  { name: 'sd_jwt_issue', description: 'Issue SD-JWT (RFC 9901) credential with selectively disclosable claims.',
    inputSchema: { type: 'object', properties: { subjectDid: { type: 'string' }, claims: { type: 'object' }, issuerDid: { type: 'string' }, algorithm: { type: 'string', enum: ['Ed25519','ML-DSA-65'] } }, required: ['subjectDid','claims','issuerDid'] } },
  { name: 'sd_jwt_present', description: 'Present SD-JWT credential with selective disclosure.',
    inputSchema: { type: 'object', properties: { credential: { type: 'string' }, disclose: { type: 'array', items: { type: 'string' } }, holderDid: { type: 'string' } }, required: ['credential','disclose','holderDid'] } },
  { name: 'taler_withdraw', description: 'Withdraw LOVE credits as GNU Taler blind-signed coins.',
    inputSchema: { type: 'object', properties: { amount: { type: 'number' }, walletDid: { type: 'string' } }, required: ['amount','walletDid'] } },
  { name: 'taler_pay', description: 'Pay with Taler blind-signed coins via exchange.',
    inputSchema: { type: 'object', properties: { amount: { type: 'number' }, merchantDid: { type: 'string' }, reference: { type: 'string' } }, required: ['amount','merchantDid','reference'] } },
  { name: 'x402_request', description: 'Create x402 payment request (Coinbase) for MCP tool access.',
    inputSchema: { type: 'object', properties: { toolName: { type: 'string' }, maxAmount: { type: 'number' } }, required: ['toolName','maxAmount'] } },
  { name: 'x402_accept', description: 'Accept x402 payment and confirm tool access.',
    inputSchema: { type: 'object', properties: { paymentId: { type: 'string' }, txHash: { type: 'string' } }, required: ['paymentId','txHash'] } },
  { name: 'pqc_audit', description: 'Audit PQC readiness across ML-DSA-65, ML-KEM-768, SD-JWT, Taler, x402.',
    inputSchema: { type: 'object', properties: { scope: { type: 'string', enum: ['all','signatures','kem','sdjwt','taler'] } } } },
];

const DEMO_NOTE = 'DEMO SHIM — synthetic values, no cryptography performed. Real primitives: packages/sovereign-primitives + workers/ledger-bridge.';

function executeTool(name: string, args: any): any {
  const shim = (payload: any) => ({ demoShim: true, attested: false, note: DEMO_NOTE, ...payload });
  switch (name) {
    case 'pqc_keygen': return shim({ keypair: { did: `did:${args.didMethod||'key'}:z${id().slice(0,16)}`, algorithms: ['Ed25519 (FIPS 186-5)','ML-DSA-65 (FIPS 204)'], keyType: 'hybrid-composite' } });
    case 'pqc_sign': return shim({ signature: { data: args.data.slice(0,16)+'...', did: args.did, compositeSig: id().slice(0,32), algorithms: ['Ed25519','ML-DSA-65'] } });
    case 'pqc_verify': return shim({ valid: null, reason: 'not evaluated — demo shim performs no verification' });
    case 'kem_encapsulate': return shim({ ciphertext: id().slice(0,48), kem: 'X-Wing (ML-KEM-768 + X25519)', algorithm: 'FIPS 203 + X25519' });
    case 'kem_decapsulate': return shim({ sharedSecret: id().slice(0,32), kem: 'X-Wing (ML-KEM-768 + X25519)' });
    case 'sd_jwt_issue': return shim({ credential: { format: 'dc+sd-jwt', id: `urn:uuid:${id()}`, claims: Object.keys(args.claims), algorithm: args.algorithm||'Ed25519' } });
    case 'sd_jwt_present': return shim({ presentation: { holder: args.holderDid, disclosed: args.disclose, verified: null, reason: 'not evaluated — demo shim' } });
    case 'taler_withdraw': return shim({ withdrawal: { amount: args.amount, wallet: args.walletDid, coins: Math.ceil(args.amount), blindSignature: 'taler-cbs-blinded', exchange: 'exchange.demo.taler.net' } });
    case 'taler_pay': return shim({ payment: { amount: args.amount, merchant: args.merchantDid, receipt: `taler-${id().slice(0,16)}`, status: 'completed' } });
    case 'x402_request': return shim({ request: { id: `x402-${id().slice(0,12)}`, tool: args.toolName, maxAmount: `${args.maxAmount} USD cents` } });
    case 'x402_accept': return shim({ payment: { id: args.paymentId, txHash: args.txHash, status: 'confirmed' }, toolAccess: 'granted' });
    case 'pqc_audit': return shim({ audit: { scope: args.scope||'all', status: 'not-attested', note: 'demo shim cannot attest compliance', components: [
      { name:'ML-DSA-65', status:'implemented in sovereign-primitives (not attested here)' }, { name:'ML-KEM-768', status:'implemented in sovereign-primitives (not attested here)' },
      { name:'SD-JWT', status:'implemented in ledger-bridge (not attested here)' }, { name:'X-Wing KEM', status:'draft-connolly-cfrg-xwing-kem (interface only here)' },
      { name:'Taler CBS', status:'WASM in taler-cbs (not exercised here)' }, { name:'x402', status:'interface only here' } ]}});
    default: return { error: `Unknown tool: ${name}` };
  }
}

// ─── MCP Server (SDK v2, stateless 2026-07-28) ─────────────────────────
// The hand-rolled stateless dispatch was replaced by the split SDK v2
// (`@modelcontextprotocol/server` → `McpServer` + `createMcpHandler`).
// The SDK handler serves the modern 2026-07-28 surface (server/discover,
// `_meta` envelope, resultType, ttlMs/cacheScope on cacheable results,
// -32022 version mismatches) and keeps 2025-era clients working through its
// default `legacy: 'stateless'` fallback (the initialize handshake) —
// equivalent to the previous hand-rolled legacy-compat branch.
// Tool handlers are pure (no `env` capture), so a module-level factory is
// safe. The demoShim/attested:false honesty markers stay in every payload.

const PROTOCOL_VERSION = '2026-07-28';

function buildServer(): McpServer {
  const server = new McpServer(
    { name: 'p31-crypto-mcp', version: '0.1.0' },
    {
      capabilities: { tools: {} },
      cacheHints: { 'tools/list': { ttlMs: 60_000, cacheScope: 'public' } },
    },
  );
  for (const t of TOOLS) {
    server.registerTool(
      t.name,
      { description: t.description, inputSchema: fromJsonSchema(t.inputSchema as unknown as Parameters<typeof fromJsonSchema>[0]) },
      async (args) => {
        const result = executeTool(t.name, args as Record<string, unknown>);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      },
    );
  }

  // Conformance (2026-07-28): `server/discover` must return top-level
  // `protocolVersion` + capabilities + serverInfo. The SDK emits
  // `supportedVersions` + `capabilities` and stamps serverInfo into `_meta`;
  // add the missing top-level keys (additive only, no other behavior change).
  const sdkServer = server.server as unknown as { _ondiscover: () => Record<string, unknown> };
  const sdkDiscover = sdkServer._ondiscover.bind(sdkServer);
  sdkServer._ondiscover = () => {
    const base = sdkDiscover();
    return {
      protocolVersion: PROTOCOL_VERSION,
      supportedProtocolVersions: Array.isArray(base.supportedVersions)
        ? [...(base.supportedVersions as string[])]
        : [PROTOCOL_VERSION],
      ...base,
    };
  };
  return server;
}

const mcpHandler = createMcpHandler(() => buildServer());

/** The SDK handler does not add CORS headers — re-apply the worker's own. */
function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return new Response(res.body, { status: res.status, headers });
}

/** Envelope-shaped 401 body for a rejected bearer token (capital-machine mcpResult shape). */
function oauthGateError(id: unknown): Record<string, unknown> {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    _meta: { 'io.modelcontextprotocol/protocolVersion': PROTOCOL_VERSION },
    result: {
      resultType: 'complete',
      content: [{ type: 'text', text: JSON.stringify({ error: 'invalid or unauthorized bearer token (RFC 8707 aud binding)' }) }],
      isError: true,
    },
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
    }

    // RFC 8414 — authorization-server metadata (points at the fleet AS).
    if (url.pathname === '/.well-known/oauth-authorization-server' && request.method === 'GET') {
      return cors(JSON.stringify(oauthAsMetadata(env.RESOURCE_ID ?? RESOURCE_URI)));
    }

    // RFC 9728 — protected-resource metadata (canonical path + alias).
    if ((url.pathname === '/.well-known/oauth-protected-resource' || url.pathname === '/.well-known/resource-server') && request.method === 'GET') {
      return cors(JSON.stringify(protectedResourceMetadata(env, RESOURCE_URI, ['crypto:read', 'crypto:write'])));
    }

    if (url.pathname === '/mcp' && request.method === 'GET') {
      return cors(JSON.stringify({ service: 'p31-crypto-mcp', transport: 'streamable-http', protocol: PROTOCOL_VERSION, mcp: 'POST /mcp', tools: TOOLS.map(t => t.name) }));
    }

    if (url.pathname === '/mcp' && request.method === 'POST') {
      // OAuth 2.1 resource-server gate: if a Bearer token was supplied on a
      // tools/call it MUST validate (RFC 8707 audience binding) — invalid ⇒
      // 401 MCP error result, never silently ignored.
      const auth = request.headers.get('Authorization') ?? '';
      if (auth.startsWith('Bearer ')) {
        let body: any = null;
        try { body = await request.clone().json(); } catch { body = null; }
        if (body?.method === 'tools/call') {
          const bearer = await verifyOAuthBearer(request, env);
          if (bearer === null) {
            return cors(JSON.stringify(oauthGateError(body?.id ?? null)), 401);
          }
        }
      }
      return withCors(await mcpHandler.fetch(request));
    }

    if (url.pathname === '/health' && request.method === 'GET')
      return cors(JSON.stringify({ status:'ok', service:'p31-crypto-mcp', version:'2.0.0', tools:TOOLS.length, backends:{ ledgerBridge:env.LEDGER_BRIDGE_URL, federationBridge:env.FEDERATION_BRIDGE_URL, talerBridge:env.TALER_BRIDGE_URL, x402Gateway:env.X402_GATEWAY_URL }, timestamp: new Date().toISOString() }));

    if (url.pathname === '/.well-known/mcp/server-card.json' && request.method === 'GET') {
      const card = {
        name: 'p31-crypto-mcp',
        description: 'P31 PQC Crypto MCP Server — DEMO SHIM (interface scaffold only; returns synthetic values, performs no cryptography, not FIPS-attested). Real tested primitives live in packages/sovereign-primitives and workers/ledger-bridge.',
        version: '0.1.0',
        demoShim: true,
        attested: false,
        endpoint: 'https://p31-crypto-mcp.trimtab-signal.workers.dev/mcp',
        transport: 'streamable-http',
        repository: 'https://github.com/p31labs/andromeda',
        homepage: 'https://p31ca.org',
        keywords: ['post-quantum','cryptography','mldsa','mlkem','slhdsa','hybrid','sd-jwt','x402','p31','demo-shim']
      };
      return new Response(JSON.stringify(card), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    if (url.pathname === '/' && request.method === 'GET')
      return cors(JSON.stringify({ service:'p31-crypto-mcp', demoShim:true, description:'Post-quantum crypto MCP wrapper — DEMO SHIM (synthetic values; real primitives in packages/sovereign-primitives)', tools: TOOLS.map(t=>t.name), mcp:'POST /mcp', protocol: PROTOCOL_VERSION }));

    return cors(JSON.stringify({ error:'Not found' }), 404);
  },
};
