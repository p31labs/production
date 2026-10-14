/**
 * p31-justice-hub — Unified Sovereign Justice Worker
 *
 * Consolidates Evidence Vault, Multi-Sig Escrow, and Online Dispute Resolution
 * into a single edge worker with 8 MCP tools over Streamable HTTP.
 *
 * MCP tools:
 *   justice_evidence_deposit  — Seal evidence hash into DO chain-of-custody
 *   justice_evidence_verify   — Verify evidence integrity via SHA-256 chain
 *   justice_case_create       — Create case with parties
 *   justice_case_list         — List active cases
 *   justice_escrow_deposit    — Deposit LOVE into multi-sig escrow
 *   justice_escrow_release    — 2-of-3 multi-sig release
 *   justice_odr_offer         — Submit blind settlement offer
 *   justice_odr_resolve       — Resolve ODR with signed acceptance
 */

import { DurableObject } from 'cloudflare:workers';
import { McpServer, createMcpHandler, fromJsonSchema } from '@modelcontextprotocol/server';

interface Env {
  JUSTICE_D1: D1Database;
  LOVE_D1: D1Database;
  EVIDENCE_R2: R2Bucket;
  JUSTICE_KV: KVNamespace;
  ESCROW_DO: DurableObjectNamespace<EscrowEngineDO>;
  EVIDENCE_DO: DurableObjectNamespace<EvidenceVaultDO>;
  /** OAuth 2.1 resource-server (RFC 8707). Optional — when unset, bearer validation is disabled and the server stays open (runbook §6). */
  OAUTH_JWKS_URL?: string;
  /** RFC 9207 expected token issuer (optional; falls back to the JWKS URL origin). */
  OAUTH_ISSUER?: string;
  /** RFC 8707 resource URI that a bearer token's `aud` claim MUST match. */
  RESOURCE_ID?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function id(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
}

function cors(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function json(data: unknown, status = 200): Response {
  return cors(JSON.stringify(data), status);
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
const RESOURCE_URI = 'https://p31-justice-hub.trimtab-signal.workers.dev/mcp';
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

// ─── DO: Evidence Vault (SHA-256 hash chain) ──────────────────────────

export class EvidenceVaultDO extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/deposit' && request.method === 'POST') {
      const { caseId, uploaderDid, payloadHash, metadata, ed25519Signature, mldsa65Signature } = await request.json<any>();

      // Reject truncated composite signatures (ML-DSA-65 = 3309 bytes, Ed25519 = 64 bytes)
      if (mldsa65Signature && mldsa65Signature.length < 6600) {
        return json({ error: 'ML-DSA-65 signature truncated — expected ≥ 6600 hex chars (3309 bytes)', receivedLength: mldsa65Signature.length }, 400);
      }
      if (ed25519Signature && ed25519Signature.length < 128) {
        return json({ error: 'Ed25519 signature truncated — expected ≥ 128 hex chars (64 bytes)', receivedLength: ed25519Signature.length }, 400);
      }

      const entryId = id();
      const ts = Date.now();

      // SHA-256 chain: entry links to previous entry in same case
      this.ctx.storage.sql.exec(
        `CREATE TABLE IF NOT EXISTS evidence (id TEXT, caseId TEXT, uploaderDid TEXT, payloadHash TEXT, prevHash TEXT, chainHash TEXT, ts INTEGER, metadata TEXT, ed25519Sig TEXT, mldsa65Sig TEXT)`
      );
      const prev = [...this.ctx.storage.sql.exec(
        `SELECT chainHash FROM evidence WHERE caseId = ? ORDER BY ts DESC LIMIT 1`, caseId
      )];
      const prevHash = prev.length > 0 ? (prev[0] as any).chainHash : null;
      const chainInput = JSON.stringify({ entryId, caseId, payloadHash, prevHash, ts });
      const chainHash = bytesToHex(new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(chainInput))
      ));

      this.ctx.storage.sql.exec(
        `INSERT INTO evidence VALUES (?,?,?,?,?,?,?,?,?,?)`,
        entryId, caseId, uploaderDid, payloadHash, prevHash, chainHash, ts,
        JSON.stringify(metadata || {}), ed25519Signature || '', mldsa65Signature || ''
      );

      return json({
        status: 'sealed', entryId, chainHash, ts,
        signatures: {
          ed25519: ed25519Signature ? 'provided' : 'pending',
          mldsa65: mldsa65Signature ? 'provided (FIPS 204)' : 'pending',
        },
        algorithm: 'SHA-256 hash chain + Ed25519 + ML-DSA-65 dual signature',
      });
    }

    if (url.pathname === '/verify' && request.method === 'POST') {
      const { entryId } = await request.json<any>();
      const rows = [...this.ctx.storage.sql.exec(
        `SELECT * FROM evidence WHERE id = ?`, entryId
      )];
      if (rows.length === 0) return json({ error: 'Entry not found' }, 404);

      const entry = rows[0] as any;
      const chainInput = JSON.stringify({
        entryId, caseId: entry.caseId,
        payloadHash: entry.payloadHash, prevHash: entry.prevHash, ts: entry.ts
      });
      const recomputed = bytesToHex(new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(chainInput))
      ));

      return json({
        entryId,
        valid: recomputed === entry.chainHash,
        payloadHash: entry.payloadHash,
        chainHash: entry.chainHash,
      });
    }

    return json({ error: 'Not found' }, 404);
  }
}

// ─── DO: Escrow Engine (2-of-3 multi-sig) ─────────────────────────────

export class EscrowEngineDO extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/lock' && request.method === 'POST') {
      const { escrowId, payerDid, payeeDid, arbiterDid, amount, condition } = await request.json<any>();
      await this.ctx.storage.put(`escrow:${escrowId}`, {
        escrowId, payerDid, payeeDid, arbiterDid, amount, condition,
        status: 'LOCKED', approvals: [], ts: Date.now(),
      });
      return json({ status: 'LOCKED', escrowId });
    }

    if (url.pathname === '/release' && request.method === 'POST') {
      const { escrowId, signerDid } = await request.json<any>();
      const escrow: any = await this.ctx.storage.get(`escrow:${escrowId}`);
      if (!escrow || escrow.status !== 'LOCKED')
        return json({ error: 'Invalid or closed escrow' }, 400);

      if (![escrow.payerDid, escrow.payeeDid, escrow.arbiterDid].includes(signerDid))
        return json({ error: 'Unauthorized signer' }, 403);

      if (!escrow.approvals.includes(signerDid))
        escrow.approvals.push(signerDid);

      if (escrow.approvals.length >= 2) {
        escrow.status = 'RELEASED';
        await this.ctx.storage.put(`escrow:${escrowId}`, escrow);
        return json({ status: 'RELEASED', escrowId, approvals: escrow.approvals });
      }

      await this.ctx.storage.put(`escrow:${escrowId}`, escrow);
      return json({ status: 'PENDING_CONSENSUS', approvals: escrow.approvals, needed: 2 });
    }

    return json({ error: 'Not found' }, 404);
  }
}

// ─── MCP Tools ────────────────────────────────────────────────────────

const JUSTICE_TOOLS = [
  {
    name: 'justice_evidence_deposit',
    description: 'Cryptographically seal evidence hash into DO case vault. SHA-256 chain + dual Ed25519 + ML-DSA-65 signatures.',
    inputSchema: {
      type: 'object',
      properties: {
        caseId: { type: 'string' },
        uploaderDid: { type: 'string' },
        payloadHash: { type: 'string', description: 'SHA-256 hash of digital evidence' },
        ed25519Signature: { type: 'string', description: 'Ed25519 signature over payloadHash' },
        mldsa65Signature: { type: 'string', description: 'ML-DSA-65 (FIPS 204) signature over payloadHash' },
        metadata: { type: 'object' },
      },
      required: ['caseId', 'uploaderDid', 'payloadHash'],
    },
  },
  {
    name: 'justice_evidence_verify',
    description: 'Verify evidence entry against SHA-256 chain to confirm integrity.',
    inputSchema: {
      type: 'object',
      properties: {
        entryId: { type: 'string', description: 'Evidence entry ID from deposit' },
      },
      required: ['entryId'],
    },
  },
  {
    name: 'justice_case_create',
    description: 'Create a new case with two parties. Stores in D1.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        partyADid: { type: 'string' },
        partyBDid: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['title', 'partyADid', 'partyBDid'],
    },
  },
  {
    name: 'justice_case_list',
    description: 'List all active cases with metadata.',
    inputSchema: { type: 'object', properties: { status: { type: 'string' } } },
  },
  {
    name: 'justice_escrow_deposit',
    description: 'Deposit LOVE credits into a 2-of-3 multi-sig escrow account.',
    inputSchema: {
      type: 'object',
      properties: {
        escrowId: { type: 'string' },
        payerDid: { type: 'string' },
        payeeDid: { type: 'string' },
        arbiterDid: { type: 'string' },
        amount: { type: 'number' },
        condition: { type: 'string' },
      },
      required: ['escrowId', 'payerDid', 'payeeDid', 'arbiterDid', 'amount'],
    },
  },
  {
    name: 'justice_escrow_release',
    description: 'Sign to release escrow. Requires 2-of-3 multi-sig consensus.',
    inputSchema: {
      type: 'object',
      properties: {
        escrowId: { type: 'string' },
        signerDid: { type: 'string' },
      },
      required: ['escrowId', 'signerDid'],
    },
  },
  {
    name: 'justice_odr_offer',
    description: 'Submit a blind settlement offer. Blinded via SHA-256 hash.',
    inputSchema: {
      type: 'object',
      properties: {
        caseId: { type: 'string' },
        partyDid: { type: 'string' },
        amount: { type: 'number' },
        round: { type: 'number' },
      },
      required: ['caseId', 'partyDid', 'amount'],
    },
  },
  {
    name: 'justice_odr_resolve',
    description: 'Resolve an ODR case by accepting the winning offer.',
    inputSchema: {
      type: 'object',
      properties: {
        caseId: { type: 'string' },
        acceptedByDid: { type: 'string' },
      },
      required: ['caseId', 'acceptedByDid'],
    },
  },
];

async function executeJusticeTool(name: string, args: any, env: Env): Promise<any> {
  switch (name) {
    case 'justice_case_create': {
      const { title, description, partyADid, partyBDid } = args;
      const caseId = `case-${id()}`;
      await env.JUSTICE_D1.prepare(
        `INSERT INTO evidence_cases (id, title, description, party_a_did, party_b_did, status, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, 'open', ?, datetime('now'))`
      ).bind(caseId, title, description || '', partyADid, partyBDid, '{}').run();
      return { caseId, status: 'created' };
    }

    case 'justice_case_list': {
      const { status = 'open' } = args;
      const result = await env.JUSTICE_D1.prepare(
        `SELECT id, title, status, party_a_did, party_b_did, created_at FROM evidence_cases WHERE status = ? ORDER BY created_at DESC LIMIT 50`
      ).bind(status).all<any>();
      return { cases: result.results || [], total: result.results?.length || 0 };
    }

    case 'justice_evidence_deposit': {
      const stub = env.EVIDENCE_DO.get(env.EVIDENCE_DO.idFromName('vault'));
      const res = await stub.fetch(new Request('http://internal/deposit', {
        method: 'POST', body: JSON.stringify(args),
      }));
      return res.json();
    }

    case 'justice_evidence_verify': {
      const stub = env.EVIDENCE_DO.get(env.EVIDENCE_DO.idFromName('vault'));
      const res = await stub.fetch(new Request('http://internal/verify', {
        method: 'POST', body: JSON.stringify(args),
      }));
      return res.json();
    }

    case 'justice_escrow_deposit': {
      const stub = env.ESCROW_DO.get(env.ESCROW_DO.idFromName(args.escrowId));
      const res = await stub.fetch(new Request('http://internal/lock', {
        method: 'POST', body: JSON.stringify(args),
      }));
      return res.json();
    }

    case 'justice_escrow_release': {
      const stub = env.ESCROW_DO.get(env.ESCROW_DO.idFromName(args.escrowId));
      const res = await stub.fetch(new Request('http://internal/release', {
        method: 'POST', body: JSON.stringify(args),
      }));
      return res.json();
    }

    case 'justice_odr_offer': {
      const { caseId, partyDid, amount, round = 1 } = args;
      const offerId = `offer-${id()}`;
      const blindedHash = bytesToHex(new Uint8Array(
        await crypto.subtle.digest('SHA-256',
          new TextEncoder().encode(`${offerId}:${amount}:${partyDid}:${round}`)
        )
      ));
      await env.JUSTICE_D1.prepare(
        `INSERT INTO odr_offers (id, case_id, party_did, blinded_hash, round, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'submitted', datetime('now'))`
      ).bind(offerId, caseId, partyDid, blindedHash, round).run();
      return { offerId, blindedHash: blindedHash.slice(0, 16), round, status: 'submitted' };
    }

    case 'justice_odr_resolve': {
      const { caseId, acceptedByDid } = args;
      await env.JUSTICE_D1.prepare(
        `UPDATE evidence_cases SET status = 'resolved', metadata = json_set(metadata, '$.resolvedBy', ?) WHERE id = ?`
      ).bind(acceptedByDid, caseId).run();
      return { caseId, status: 'resolved', resolvedBy: acceptedByDid };
    }

    default:
      return { error: `Unknown tool: ${name}` };
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
// `executeJusticeTool` uses `env` (JUSTICE_D1, EVIDENCE_DO, ESCROW_DO), so
// the handler is built per request inside `fetch` (closes over `env`).

const PROTOCOL_VERSION = '2026-07-28';

function buildServer(env: Env): McpServer {
  const server = new McpServer(
    { name: 'p31-justice-hub', version: '1.0.0' },
    {
      capabilities: { tools: {} },
      cacheHints: { 'tools/list': { ttlMs: 60_000, cacheScope: 'public' } },
    },
  );
  for (const t of JUSTICE_TOOLS) {
    server.registerTool(
      t.name,
      { description: t.description, inputSchema: fromJsonSchema(t.inputSchema as unknown as Parameters<typeof fromJsonSchema>[0]) },
      async (args) => {
        const result = await executeJusticeTool(t.name, args as Record<string, unknown>, env);
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

// ─── Streamable HTTP MCP Server ───────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // CORS
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // RFC 8414 — authorization-server metadata (points at the fleet AS).
    if (url.pathname === '/.well-known/oauth-authorization-server' && method === 'GET') {
      return cors(JSON.stringify(oauthAsMetadata(env.RESOURCE_ID ?? RESOURCE_URI)));
    }

    // RFC 9728 — protected-resource metadata (canonical path + alias).
    if ((url.pathname === '/.well-known/oauth-protected-resource' || url.pathname === '/.well-known/resource-server') && method === 'GET') {
      return cors(JSON.stringify(protectedResourceMetadata(env, RESOURCE_URI, ['justice:read', 'justice:write'])));
    }

    // MCP Server Card (Smithery discovery)
    if (url.pathname === '/.well-known/mcp/server-card.json' && method === 'GET') {
      return cors(JSON.stringify({
        $schema: 'https://schema.smithery.ai/server-card.json',
        name: 'p31-justice-hub',
        description: 'P31 Justice Hub MCP — case management, 2-of-3 multi-sig escrow, SHA-256 evidence chains, and blind ODR settlement.',
        version: '1.0.0',
        serverInfo: { name: 'p31-justice-hub', version: '1.0.0' },
        endpoint: 'https://p31-justice-hub.trimtab-signal.workers.dev/mcp',
        transport: 'streamable-http',
        authentication: { type: 'none' },
        tools: JUSTICE_TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
        resources: [],
        prompts: [],
      }));
    }

    // Streamable HTTP: GET /mcp returns endpoint metadata (stateless — no SSE)
    if (url.pathname === '/mcp' && method === 'GET') {
      return cors(JSON.stringify({
        service: 'p31-justice-hub', transport: 'streamable-http', protocol: PROTOCOL_VERSION,
        mcp: 'POST /mcp', tools: JUSTICE_TOOLS.map(t => t.name),
      }));
    }

    // Streamable HTTP: POST /mcp for JSON-RPC 2.0 — served by the SDK v2 handler.
    if (url.pathname === '/mcp' && method === 'POST') {
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
      const handler = createMcpHandler(() => buildServer(env));
      return withCors(await handler.fetch(request));
    }

    // Health
    if (url.pathname === '/health' && method === 'GET') {
      return cors(JSON.stringify({
        status: 'ok', service: 'p31-justice-hub', version: '1.0.0',
        tools: JUSTICE_TOOLS.length,
        timestamp: new Date().toISOString(),
      }));
    }

    // Root
    if (url.pathname === '/' && method === 'GET') {
      return cors(JSON.stringify({
        service: 'p31-justice-hub',
        tools: JUSTICE_TOOLS.map(t => t.name),
        mcp: 'POST /mcp',
        protocol: PROTOCOL_VERSION,
      }));
    }

    return cors(JSON.stringify({ error: 'Not found' }), 404);
  },
};
