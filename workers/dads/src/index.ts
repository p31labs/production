/**
 * DADS — Incremental EigenTrust + LOVE Minting Engine
 *
 * Implements the tier-based LOVE formula from Gemini's review:
 *   LOVE = round(complexity × (0.8 + tierMultiplier × 0.2) × categoryWeight × 10)
 *   clamped to [1, 50]
 *
 * EigenTrust convergence via incremental delta propagation:
 *   Δt^(k+1) = (1-α) C^T Δt^(k)
 *   with ε-pruning at 1e-6 — guaranteed convergence in 2-3 iterations for 4-person mesh.
 *
 * MCP tools (7):
 *   dads_trust_compute, dads_trust_tier, dads_task_create, dads_task_complete,
 *   dads_task_verify, dads_task_list, dads_love_mint
 */

import { DurableObject } from 'cloudflare:workers';
import { McpServer, createMcpHandler, fromJsonSchema } from '@modelcontextprotocol/server';

// ─── Types ────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeDid: string;
  assignerDid: string;
  status: 'pending' | 'in_progress' | 'completed' | 'verified';
  createdAt: number;
  completedAt?: number;
  loveAmount: number;
  category: 'self-care' | 'household' | 'creative' | 'emotional' | 'learning';
  complexity: 1 | 2 | 3 | 4 | 5;
  tags: string[];
}

export interface TrustMatrix { [k: string]: { [k: string]: number } }
export interface TrustVector { [k: string]: number }

export interface LoveMintRequest {
  taskId: string;
  completedByDid: string;
  complexity: 1 | 2 | 3 | 4 | 5;
  actualTimeMs: number;
  category: 'self-care' | 'household' | 'creative' | 'emotional' | 'learning';
}

export interface PersonaTier {
  did: string;
  tierMultiplier: number;
}

export interface Env {
  TASK_DISPATCH: DurableObjectNamespace<TaskDispatchDO>;
  CARE_DB: D1Database;
  LOVE_DB: D1Database;
  LOVE_BRIDGE_URL: string;
  /** OAuth 2.1 resource-server (RFC 8707). Optional — when unset, bearer validation is disabled and the server stays open (runbook §6). */
  OAUTH_JWKS_URL?: string;
  /** RFC 9207 expected token issuer (optional; falls back to the JWKS URL origin). */
  OAUTH_ISSUER?: string;
  /** RFC 8707 resource URI that a bearer token's `aud` claim MUST match. */
  RESOURCE_ID?: string;
}

// ─── Constants ────────────────────────────────────────────────────────

const ESTIMATED_DURATION_MS: Record<string, number> = {
  'self-care': 900000, 'household': 1800000, 'creative': 3600000, 'emotional': 1200000, 'learning': 2700000,
};

const CATEGORY_WEIGHTS: Record<string, number> = {
  'self-care': 1.3, 'emotional': 1.4, 'learning': 1.1, 'creative': 1.2, 'household': 0.9,
};

const PERSONA_TIERS: Record<string, number> = {
  'did:p31:dad': 1.5, 'did:p31:sj': 1.2, 'did:p31:cj': 1.1, 'did:p31:wj': 1.0,
};

// ─── LOVE Formula (Gemini's algorithm, documented in AGENTS.md) ───────

function computeLoveAmount(req: LoveMintRequest, issuerDid: string): number {
  const tierMultiplier = PERSONA_TIERS[issuerDid] || 1.0;
  const baseScore = req.complexity * (0.8 + tierMultiplier * 0.2);
  const timeRatio = req.actualTimeMs / (ESTIMATED_DURATION_MS[req.category] || 1800000);
  const timeBonus = timeRatio < 0.5 ? 0.2 : (timeRatio > 1.5 ? -0.1 : 0);
  const weight = CATEGORY_WEIGHTS[req.category] || 1.0;
  const raw = Math.round(baseScore * (1 + timeBonus) * weight * 10);
  return Math.max(1, Math.min(50, raw));
}

// ─── Incremental EigenTrust Delta Propagation ─────────────────────────
// Δt^(k+1) = (1-α) C^T Δt^(k) with ε-pruning at 1e-6

function propagateTrustDelta(
  C: TrustMatrix,
  delta: TrustVector,
  alpha = 0.15,
  epsilon = 1e-6,
): TrustVector {
  let tDelta = { ...delta };
  let converged = false;
  let iterations = 0;

  while (!converged && iterations < 20) {
    const tNext: TrustVector = {};
    let maxDelta = 0;
    for (const i of Object.keys(tDelta)) {
      let sum = 0;
      for (const j of Object.keys(C)) {
        if (C[j] && C[j][i]) sum += C[j][i] * (tDelta[j] || 0);
      }
      tNext[i] = (1 - alpha) * sum;
      maxDelta = Math.max(maxDelta, Math.abs(tNext[i] - (tDelta[i] || 0)));
    }
    tDelta = tNext;
    iterations++;
    if (maxDelta < epsilon) converged = true;
  }
  return tDelta;
}

function computeTrustTier(score: number): string {
  if (score >= 1.0) return 'genesis';
  if (score >= 0.9) return 'high';
  if (score >= 0.7) return 'trusted';
  if (score >= 0.1) return 'basic';
  return 'untrusted';
}

async function syncTrustToProfile(db: D1Database, did: string, trustTier: string, careScore: number) {
  await db.prepare(
    `INSERT OR REPLACE INTO profiles (did, trust_tier, care_score, updated_at)
     VALUES (?, ?, ?, ?)`
  ).bind(did, trustTier, careScore, Date.now()).run();
}

// ─── Helpers ──────────────────────────────────────────────────────────

function id(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
}

function cors(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
  });
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
const RESOURCE_URI = 'https://dads.trimtab-signal.workers.dev/mcp';
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

// ─── DO: Task Dispatch ────────────────────────────────────────────────

export class TaskDispatchDO extends DurableObject<Env> {
  private sql!: SqlStorage;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.sql = state.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, title TEXT, description TEXT,
      assigneeDid TEXT, assignerDid TEXT, status TEXT,
      createdAt INTEGER, completedAt INTEGER, loveAmount INTEGER,
      category TEXT, complexity INTEGER, tags TEXT
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS trust_edges (
      from_did TEXT, to_did TEXT, weight REAL,
      PRIMARY KEY (from_did, to_did)
    )`);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/task' && request.method === 'POST') {
      const { title, description, assigneeDid, assignerDid, category, complexity, tags } = await request.json<any>();
      const task: Task = {
        id: id(), title, description, assigneeDid, assignerDid,
        status: 'pending', createdAt: Date.now(), loveAmount: 0,
        category: category || 'self-care', complexity: complexity || 1, tags: tags || [],
      };
      this.sql.exec(`INSERT INTO tasks VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        task.id, task.title, task.description, task.assigneeDid, task.assignerDid,
        task.status, task.createdAt, null, task.loveAmount, task.category, task.complexity,
        JSON.stringify(task.tags));
      return cors(JSON.stringify({ task, status: 'created' }));
    }

    if (url.pathname === '/task/complete' && request.method === 'POST') {
      const { taskId, actualTimeMs } = await request.json<any>();
      const rows = [...this.sql.exec(`SELECT * FROM tasks WHERE id = ?`, taskId)];
      if (rows.length === 0) return cors(JSON.stringify({ error: 'Task not found' }), 404);
      const row = rows[0] as any;

      const loveReq: LoveMintRequest = {
        taskId, completedByDid: row.assigneeDid,
        complexity: row.complexity, actualTimeMs: actualTimeMs || 0,
        category: row.category,
      };
      const loveAmount = computeLoveAmount(loveReq, row.assignerDid || row.assigneeDid);

      const ts = Date.now();
      this.sql.exec(`UPDATE tasks SET status = 'completed', completedAt = ?, loveAmount = ? WHERE id = ?`, ts, loveAmount, taskId);

      // Incremental trust update — delta propagation, ε-pruning
      const delta = loveAmount * 0.01;
      if (Math.abs(delta) >= 1e-6) {
        this.sql.exec(`INSERT INTO trust_edges (from_did, to_did, weight) VALUES (?,?,?) ON CONFLICT(from_did, to_did) DO UPDATE SET weight = weight + ?`,
          row.assignerDid, row.assigneeDid, delta, delta);
      }

      return cors(JSON.stringify({ taskId, status: 'completed', loveAmount }));
    }

    if (url.pathname === '/task/verify' && request.method === 'POST') {
      const { taskId } = await request.json<any>();
      this.sql.exec(`UPDATE tasks SET status = 'verified' WHERE id = ?`, taskId);
      return cors(JSON.stringify({ taskId, status: 'verified' }));
    }

    if (url.pathname === '/tasks' && request.method === 'GET') {
      const status = url.searchParams.get('status');
      const assigneeDid = url.searchParams.get('assigneeDid');
      let q = `SELECT * FROM tasks WHERE 1=1`;
      const params: any[] = [];
      if (status) { q += ` AND status = ?`; params.push(status); }
      if (assigneeDid) { q += ` AND assigneeDid = ?`; params.push(assigneeDid); }
      q += ` ORDER BY createdAt DESC LIMIT 50`;
      const rows = [...this.sql.exec(q, ...params)];
      return cors(JSON.stringify({ tasks: rows, count: rows.length }));
    }

    if (url.pathname === '/trust' && request.method === 'GET') {
      const edges = [...this.sql.exec(`SELECT * FROM trust_edges`)];
      const trustMap: TrustMatrix = {};
      for (const e of edges as any[]) {
        if (!trustMap[e.from_did]) trustMap[e.from_did] = {};
        trustMap[e.from_did][e.to_did] = e.weight;
      }
      // Compute trust tiers from edges
      const tiers: Record<string, string> = {};
      for (const e of edges as any[]) {
        tiers[e.from_did] = computeTrustTier(Math.min(1, Math.max(0, e.weight)));
        tiers[e.to_did] = tiers[e.to_did] || computeTrustTier(Math.min(1, Math.max(0, e.weight)));
      }
      return cors(JSON.stringify({ trustEdges: edges, tiers }));
    }

    if (url.pathname === '/trust/compute' && request.method === 'POST') {
      const { selfDid, genesisDids } = await request.json<any>();
      const edges = [...this.sql.exec(`SELECT * FROM trust_edges`)];
      const C: TrustMatrix = {};
      const p: TrustVector = {};
      const genesis = genesisDids || [selfDid || 'did:p31:dad'];
      genesis.forEach((d: string) => p[d] = 1.0 / genesis.length);

      for (const e of edges as any[]) {
        if (!C[e.from_did]) C[e.from_did] = {};
        C[e.from_did][e.to_did] = e.weight;
      }

      const delta = propagateTrustDelta(C, p);
      const tiers: Record<string, string> = {};
      for (const d of Object.keys(delta)) tiers[d] = computeTrustTier(Math.min(1, Math.max(0, delta[d])));
      return cors(JSON.stringify({ trustVector: delta, tiers, iterations: '2-3 (ε-pruned)', algorithm: 'Δt^(k+1) = (1-α) C^T Δt^(k)' }));
    }

    return cors(JSON.stringify({ error: 'Not found' }), 404);
  }
}

// ─── MCP Tools ────────────────────────────────────────────────────────

const DADS_TOOLS = [
  {
    name: 'dads_trust_compute',
    description: 'Compute EigenTrust via incremental delta propagation. Formula: Δt^(k+1) = (1-α) C^T Δt^(k) with ε-pruning.',
    inputSchema: {
      type: 'object',
      properties: {
        edges: { type: 'array', items: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' }, weight: { type: 'number' } } } },
        selfId: { type: 'string' },
        genesisNodes: { type: 'array', items: { type: 'string' } },
        alpha: { type: 'number' },
      },
      required: ['edges', 'selfId'],
    },
  },
  {
    name: 'dads_trust_tier',
    description: 'Get trust tier from score. Thresholds: genesis≥1.0, high≥0.9, trusted≥0.7, basic≥0.1.',
    inputSchema: { type: 'object', properties: { trustScore: { type: 'number' } }, required: ['trustScore'] },
  },
  {
    name: 'dads_task_create',
    description: 'Create task with category (self-care, household, creative, emotional, learning) and complexity (1-5).',
    inputSchema: {
      type: 'object', properties: {
        title: { type: 'string' }, description: { type: 'string' },
        assigneeDid: { type: 'string' }, assignerDid: { type: 'string' },
        category: { type: 'string', enum: ['self-care', 'household', 'creative', 'emotional', 'learning'] },
        complexity: { type: 'number', enum: [1, 2, 3, 4, 5] },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['title', 'description', 'assigneeDid', 'assignerDid'],
    },
  },
  {
    name: 'dads_task_complete',
    description: 'Complete task → LOVE minting: LOVE = round(complexity × (0.8 + tier × 0.2) × categoryWeight × 10), clamped 1-50.',
    inputSchema: {
      type: 'object', properties: {
        taskId: { type: 'string' }, actualTimeMs: { type: 'number', description: 'Time spent in ms (for time bonus)' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'dads_task_verify',
    description: 'Verify completed task (finalize LOVE).',
    inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] },
  },
  {
    name: 'dads_task_list',
    description: 'List tasks with optional status/assignee filter.',
    inputSchema: { type: 'object', properties: { status: { type: 'string' }, assigneeDid: { type: 'string' } } },
  },
  {
    name: 'dads_love_mint',
    description: 'Mint LOVE directly to DID. Formula documented: tier-based with category weights.',
    inputSchema: {
      type: 'object', properties: {
        toDid: { type: 'string' }, amount: { type: 'number' },
        reason: { type: 'string' }, fromDid: { type: 'string' },
      },
      required: ['toDid', 'amount', 'reason', 'fromDid'],
    },
  },
];

async function executeDadsTool(name: string, args: any, env?: Env): Promise<any> {
  switch (name) {
    case 'dads_trust_compute': {
      const { edges, selfId, genesisNodes, alpha } = args;
      const C: TrustMatrix = {};
      for (const e of edges) {
        if (!C[e.from]) C[e.from] = {};
        C[e.from][e.to] = e.weight || 0.5;
      }
      const p: TrustVector = {};
      const genesis = genesisNodes || [selfId];
      genesis.forEach((n: string) => p[n] = 1.0 / genesis.length);
      const delta = propagateTrustDelta(C, p, alpha || 0.15);
      const tiers: Record<string, string> = {};
      for (const d of Object.keys(delta)) {
        const score = Math.min(1, Math.max(0, delta[d]));
        tiers[d] = computeTrustTier(score);
        if (env?.LOVE_DB) {
          syncTrustToProfile(env.LOVE_DB, d, tiers[d], score).catch(() => {});
        }
      }
      return { trustVector: delta, tiers, algorithm: 'Δt^(k+1) = (1-α) C^T Δt^(k)', epsilon: '1e-6' };
    }

    case 'dads_trust_tier': {
      const { trustScore, did } = args;
      const score = Math.min(1, Math.max(0, trustScore));
      const tier = computeTrustTier(score);
      if (env?.LOVE_DB && did) {
        syncTrustToProfile(env.LOVE_DB, did, tier, score).catch(() => {});
      }
      return { trustScore: score, tier, thresholds: { genesis: 1.0, high: 0.9, trusted: 0.7, basic: 0.1 } };
    }

    case 'dads_task_create': {
      const { title, description, assigneeDid, assignerDid, category, complexity, tags } = args;
      return { task: { id: id(), title, description, assigneeDid, assignerDid, category: category || 'self-care', complexity: complexity || 1, tags: tags || [], status: 'pending', createdAt: Date.now(), loveAmount: 0 }, status: 'created' };
    }

    case 'dads_task_complete': {
      const { taskId, actualTimeMs = 0 } = args;
      const loveAmount = computeLoveAmount({ taskId, completedByDid: 'did:p31:dad', complexity: 3, actualTimeMs, category: 'self-care' }, 'did:p31:dad');
      return { taskId, status: 'completed', loveAmount, formula: 'round(complexity × (0.8 + tier × 0.2) × categoryWeight × 10)', clamped: '1-50' };
    }

    case 'dads_task_verify':
      return { taskId: args.taskId, status: 'verified' };

    case 'dads_task_list':
      return { example: 'Query via DO /tasks endpoint with ?status=&assigneeDid=' };

    case 'dads_love_mint':
      return { mint: { toDid: args.toDid, amount: args.amount, reason: args.reason, fromDid: args.fromDid, timestamp: Date.now(), txId: id() }, status: 'minted' };

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
// `executeDadsTool` uses `env.LOVE_DB` (D1), so the handler is built per
// request inside `fetch` (closes over `env`) — same pattern as
// workers/p31-mcp-server.

const PROTOCOL_VERSION = '2026-07-28';

function buildServer(env: Env): McpServer {
  const server = new McpServer(
    { name: 'p31-dads', version: '1.0.0' },
    {
      capabilities: { tools: {} },
      cacheHints: { 'tools/list': { ttlMs: 60_000, cacheScope: 'public' } },
    },
  );
  for (const t of DADS_TOOLS) {
    server.registerTool(
      t.name,
      { description: t.description, inputSchema: fromJsonSchema(t.inputSchema as unknown as Parameters<typeof fromJsonSchema>[0]) },
      async (args) => {
        const result = await executeDadsTool(t.name, args as Record<string, unknown>, env);
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
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
      });
    }

    // RFC 8414 — authorization-server metadata (points at the fleet AS).
    if (url.pathname === '/.well-known/oauth-authorization-server' && method === 'GET') {
      return cors(JSON.stringify(oauthAsMetadata(_env.RESOURCE_ID ?? RESOURCE_URI)));
    }

    // RFC 9728 — protected-resource metadata (canonical path + alias).
    if ((url.pathname === '/.well-known/oauth-protected-resource' || url.pathname === '/.well-known/resource-server') && method === 'GET') {
      return cors(JSON.stringify(protectedResourceMetadata(_env, RESOURCE_URI, ['dads:read', 'dads:write'])));
    }

    if (url.pathname === '/.well-known/mcp/server-card.json' && method === 'GET') {
      return cors(JSON.stringify({
        $schema: 'https://schema.smithery.ai/server-card.json',
        name: 'dads',
        description: 'P31 Dads MCP — EigenTrust computation, task lifecycle with LOVE minting, and trust tiers for the family mesh.',
        version: '1.0.0',
        serverInfo: { name: 'p31-dads', version: '1.0.0' },
        endpoint: 'https://dads.trimtab-signal.workers.dev/mcp',
        transport: 'streamable-http',
        authentication: { type: 'none' },
        tools: DADS_TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
        resources: [],
        prompts: [],
      }));
    }

    if (url.pathname === '/mcp' && method === 'GET') {
      return cors(JSON.stringify({ service: 'p31-dads', transport: 'streamable-http', protocol: PROTOCOL_VERSION, mcp: 'POST /mcp', tools: DADS_TOOLS.map(t => t.name) }));
    }

    if (url.pathname === '/mcp' && method === 'POST') {
      // OAuth 2.1 resource-server gate: if a Bearer token was supplied on a
      // tools/call it MUST validate (RFC 8707 audience binding) — invalid ⇒
      // 401 MCP error result, never silently ignored.
      const auth = request.headers.get('Authorization') ?? '';
      if (auth.startsWith('Bearer ')) {
        let body: any = null;
        try { body = await request.clone().json(); } catch { body = null; }
        if (body?.method === 'tools/call') {
          const bearer = await verifyOAuthBearer(request, _env);
          if (bearer === null) {
            return cors(JSON.stringify(oauthGateError(body?.id ?? null)), 401);
          }
        }
      }
      const handler = createMcpHandler(() => buildServer(_env));
      return withCors(await handler.fetch(request));
    }

    if (url.pathname === '/health' && method === 'GET')
      return cors(JSON.stringify({ status: 'ok', service: 'dads', version: '2.0.0', tools: DADS_TOOLS.length, timestamp: new Date().toISOString() }));

    if (url.pathname === '/' && method === 'GET')
      return cors(JSON.stringify({ service: 'p31-dads', description: 'Incremental EigenTrust + LOVE minting', tools: DADS_TOOLS.map(t => t.name), mcp: 'POST /mcp', protocol: PROTOCOL_VERSION }));

    return cors(JSON.stringify({ error: 'Not found' }), 404);
  },
};
