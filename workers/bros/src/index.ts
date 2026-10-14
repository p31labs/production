/**
 * BROS — Zero-State Signaling + Care Issuance
 *
 * Durable Object signaling rooms with native Cloudflare Hibernation API.
 * No manual timers. No monolithic state serialization.
 * Cloudflare evicts DO when all WebSockets close — $0/s idle cost.
 *
 * MCP tools (8):
 *   bros_persona_switch, bros_persona_list, bros_room_create, bros_room_join,
 *   bros_issue_care (enum reason), bros_issuances, bros_crisis_ping, bros_hibernation_status
 */

import { DurableObject } from 'cloudflare:workers';
import { McpServer, createMcpHandler, fromJsonSchema } from '@modelcontextprotocol/server';

// ─── Types ────────────────────────────────────────────────────────────

export type CareReason =
  | 'medication_reminder'
  | 'appointment_confirmed'
  | 'sensory_break_earned'
  | 'achievement_unlocked'
  | 'learning_session_start'
  | 'crisis_support'
  | 'compliance_check'
  | 'care_delegation';

export interface Persona {
  id: string;
  name: string;
  role: 'caregiver' | 'dependent' | 'clinical' | 'system';
  did: string;
  color: string;
  tierMultiplier: number;
}

export interface CareIssuance {
  id: string;
  fromPersona: string;
  toDid: string;
  reason: CareReason;
  metadata?: Record<string, unknown>;
  timestamp: number;
  loveAmount: number;
  signature?: string;
}

export interface AlertPolicy {
  urgency: 'low' | 'medium' | 'high' | 'critical';
  action: 'notify_primary' | 'notify_all' | 'escalate_clinical' | 'pause_game';
  maxRetries: number;
  ttlSeconds: number;
}

export interface Env {
  SIGNALING_ROOM: DurableObjectNamespace<SignalingRoom>;
  LOVE_BRIDGE_URL: string;
  /** OAuth 2.1 resource-server (RFC 8707). Optional — when unset, bearer validation is disabled and the server stays open (runbook §6). */
  OAUTH_JWKS_URL?: string;
  /** RFC 9207 expected token issuer (optional; falls back to the JWKS URL origin). */
  OAUTH_ISSUER?: string;
  /** RFC 8707 resource URI that a bearer token's `aud` claim MUST match. */
  RESOURCE_ID?: string;
}

// ─── O(1) Persona Index ───────────────────────────────────────────────

const PERSONA_INDEX = new Map<string, Persona>([
  ['dad', { id: 'dad', name: 'Dad', role: 'caregiver', did: 'did:p31:dad', color: '#00F0FF', tierMultiplier: 1.5 }],
  ['sj', { id: 'sj', name: 'S.J.', role: 'caregiver', did: 'did:p31:sj', color: '#A78BFA', tierMultiplier: 1.2 }],
  ['cj', { id: 'cj', name: 'C.J.', role: 'clinical', did: 'did:p31:cj', color: '#34D399', tierMultiplier: 1.1 }],
  ['wj', { id: 'wj', name: 'W.J.', role: 'dependent', did: 'did:p31:wj', color: '#FBBF24', tierMultiplier: 1.0 }],
]);

// ─── Crisis Action Mapping ────────────────────────────────────────────

const ALERT_POLICIES: Record<string, AlertPolicy> = {
  low:      { urgency: 'low',      action: 'notify_primary',     maxRetries: 3, ttlSeconds: 3600 },
  medium:   { urgency: 'medium',   action: 'notify_all',         maxRetries: 5, ttlSeconds: 1800 },
  high:     { urgency: 'high',     action: 'escalate_clinical',  maxRetries: 10, ttlSeconds: 300 },
  critical: { urgency: 'critical', action: 'pause_game',         maxRetries: 0, ttlSeconds: 60 },
};

// ─── Helpers ──────────────────────────────────────────────────────────

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
const RESOURCE_URI = 'https://bros.trimtab-signal.workers.dev/mcp';
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

// ─── Durable Object: Signaling Room ───────────────────────────────────
// Zero-state: no manual timers, no monolithic saves.
// Cloudflare natively evicts when all WebSockets close.

export class SignalingRoom extends DurableObject<Env> {
  private sql!: SqlStorage;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.sql = state.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS issuances (
      id TEXT PRIMARY KEY, fromPersona TEXT, toDid TEXT, reason TEXT,
      timestamp INTEGER, loveAmount INTEGER, signature TEXT
    )`);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade — handle on any path since main worker routes /rooms/{id} here.
    // Cloudflare handles hibernation natively.
    const upgrade = request.headers.get('Upgrade');
    if (upgrade === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      // Hibernation API: ctx.acceptWebSocket enables zero-state dormancy.
      // Do NOT call server.accept() — ctx.acceptWebSocket handles both accept + hibernation.
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ joinedAt: Date.now() });
      return new Response(null, { status: 101, webSocket: client });
    }

    // HTTP endpoints
    if (url.pathname === '/persona' && request.method === 'POST') {
      const { personaId } = await request.json<any>();
      const persona = PERSONA_INDEX.get(personaId);
      if (!persona) return cors(JSON.stringify({ error: `Invalid persona: ${personaId}` }), 400);
      return cors(JSON.stringify({ success: true, activePersona: persona }));
    }

    if (url.pathname === '/persona' && request.method === 'GET') {
      return cors(JSON.stringify({ personas: Array.from(PERSONA_INDEX.values()) }));
    }

    if (url.pathname === '/care' && request.method === 'POST') {
      const { fromPersona, toDid, reason, metadata } = await request.json<any>();
      if (!fromPersona || !toDid || !reason)
        return cors(JSON.stringify({ error: 'fromPersona, toDid, reason required' }), 400);

      if (!PERSONA_INDEX.has(fromPersona))
        return cors(JSON.stringify({ error: `Unknown persona: ${fromPersona}` }), 400);

      const validReasons: CareReason[] = ['medication_reminder','appointment_confirmed','sensory_break_earned',
        'achievement_unlocked','learning_session_start','crisis_support','compliance_check','care_delegation'];
      if (!validReasons.includes(reason))
        return cors(JSON.stringify({ error: `Invalid reason: ${reason}. Valid: ${validReasons.join(',')}` }), 400);

      const issuance: CareIssuance = {
        id: id(), fromPersona, toDid, reason, metadata, timestamp: Date.now(),
        loveAmount: computeLove(fromPersona, toDid, reason),
      };

      // Granular SQLite insert — no monolithic state save
      this.sql.exec(
        `INSERT INTO issuances VALUES (?,?,?,?,?,?,?)`,
        issuance.id, issuance.fromPersona, issuance.toDid, issuance.reason,
        issuance.timestamp, issuance.loveAmount, issuance.signature || ''
      );

      return cors(JSON.stringify({ issuance, status: 'issued' }));
    }

    if (url.pathname === '/issuances' && request.method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const rows = [...this.sql.exec(
        `SELECT * FROM issuances ORDER BY timestamp DESC LIMIT ?`, limit
      )];
      return cors(JSON.stringify({ issuances: rows }));
    }

    if (url.pathname === '/crisis' && request.method === 'POST') {
      const { urgency } = await request.json<any>();
      const policy = ALERT_POLICIES[urgency] || ALERT_POLICIES.medium;
      return cors(JSON.stringify({ status: 'alert_dispatched', policy }));
    }

    if (url.pathname === '/stats' && request.method === 'GET') {
      const count = [...this.sql.exec(`SELECT COUNT(*) as c FROM issuances`)];
      return cors(JSON.stringify({
        isHibernating: this.ctx.getWebSockets().length === 0,
        activeSockets: this.ctx.getWebSockets().length,
        totalIssuances: count.length > 0 ? (count[0] as any).c : 0,
      }));
    }

    return cors(JSON.stringify({ error: 'Not found' }), 404);
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    this.broadcast(ws, message);
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    // Runtime auto-replies to Close frames (compat date >= 2026-04-07)
  }

  private broadcast(sender: WebSocket, data: string | ArrayBuffer): void {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws !== sender && ws.readyState === WebSocket.OPEN) ws.send(data);
    }
  }
}

// ─── LOVE Formula ─────────────────────────────────────────────────────
// complexity × tierMultiplier × categoryWeight, clamped 1–50

const CATEGORY_WEIGHTS: Record<string, number> = {
  medication_reminder: 1.0,
  appointment_confirmed: 1.1,
  sensory_break_earned: 1.3,
  achievement_unlocked: 1.2,
  learning_session_start: 1.1,
  crisis_support: 1.4,
  compliance_check: 1.0,
  care_delegation: 1.2,
};

function computeLove(fromPersona: string, _toDid: string, reason: string): number {
  const persona = PERSONA_INDEX.get(fromPersona) || { tierMultiplier: 1.0 };
  const baseScore = 1 * (0.8 + persona.tierMultiplier * 0.2);
  const catWeight = CATEGORY_WEIGHTS[reason] || 1.0;
  const raw = Math.round(baseScore * catWeight * 10);
  return Math.max(1, Math.min(50, raw));
}

// ─── MCP Tools ────────────────────────────────────────────────────────

const BROS_TOOLS = [
  {
    name: 'bros_persona_switch',
    description: 'Switch active persona for care issuance. Personas: dad (1.5x), sj (1.2x), cj (1.1x), wj (1.0x).',
    inputSchema: {
      type: 'object',
      properties: {
        personaId: { type: 'string', enum: ['dad', 'sj', 'cj', 'wj'] },
        roomId: { type: 'string' },
      },
      required: ['personaId'],
    },
  },
  {
    name: 'bros_persona_list',
    description: 'List all personas with role, tier multiplier, and color.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'bros_room_create',
    description: 'Create a signaling room for real-time mesh communication.',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string' },
        meshContext: { type: 'object', properties: { vertex: { type: 'string' }, edge: { type: 'string' }, loveTotal: { type: 'number' } } },
      },
    },
  },
  {
    name: 'bros_room_join',
    description: 'Join signaling room via WebSocket (return upgrade URL).',
    inputSchema: { type: 'object', properties: { roomId: { type: 'string' } }, required: ['roomId'] },
  },
  {
    name: 'bros_issue_care',
    description: 'Issue LOVE from persona to DID with enum reason. Formula: complexity × tier × category (1-50 LOVE).',
    inputSchema: {
      type: 'object',
      properties: {
        fromPersona: { type: 'string', enum: ['dad', 'sj', 'cj', 'wj'] },
        toDid: { type: 'string' },
        reason: { type: 'string', enum: [
          'medication_reminder', 'appointment_confirmed', 'sensory_break_earned',
          'achievement_unlocked', 'learning_session_start', 'crisis_support',
          'compliance_check', 'care_delegation'
        ]},
        metadata: { type: 'object' },
      },
      required: ['fromPersona', 'toDid', 'reason'],
    },
  },
  {
    name: 'bros_issuances',
    description: 'Get recent care issuances from room.',
    inputSchema: { type: 'object', properties: { roomId: { type: 'string' }, limit: { type: 'number' } }, required: ['roomId'] },
  },
  {
    name: 'bros_crisis_ping',
    description: 'Send crisis ping with urgency. Action mapping: low=notify_primary, medium=notify_all, high=escalate_clinical, critical=pause_game.',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string' },
        urgency: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      },
      required: ['roomId', 'urgency'],
    },
  },
  {
    name: 'bros_hibernation_status',
    description: 'Get hibernation status and issuance count for a room.',
    inputSchema: { type: 'object', properties: { roomId: { type: 'string' } }, required: ['roomId'] },
  },
];

function executeBrosTool(name: string, args: any): any {
  switch (name) {
    case 'bros_persona_switch': {
      const p = PERSONA_INDEX.get(args.personaId);
      if (!p) return { error: `Invalid persona: ${args.personaId}` };
      return { success: true, activePersona: p };
    }
    case 'bros_persona_list':
      return { personas: Array.from(PERSONA_INDEX.values()) };
    case 'bros_room_create':
      return { roomId: args.roomId || id(), status: 'created', wsUrl: `/rooms/${args.roomId || id()}` };
    case 'bros_room_join':
      return { roomId: args.roomId, status: 'joined', wsUrl: `wss://bros.trimtab-signal.workers.dev/rooms/${args.roomId}` };
    case 'bros_issue_care': {
      const { fromPersona, toDid, reason } = args;
      const love = computeLove(fromPersona, toDid, reason);
      return { issuance: { id: id(), fromPersona, toDid, reason, timestamp: Date.now(), loveAmount: love }, status: 'issued' };
    }
    case 'bros_issuances':
      return { roomId: args.roomId, issuances: [], note: 'Query via DO /issuances endpoint' };
    case 'bros_crisis_ping': {
      const policy = ALERT_POLICIES[args.urgency] || ALERT_POLICIES.medium;
      return { status: 'alert_dispatched', policy };
    }
    case 'bros_hibernation_status':
      return { roomId: args.roomId, status: 'query via DO /stats endpoint' };
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
// Tool handlers are pure (no `env` capture), so a module-level factory is safe.

const PROTOCOL_VERSION = '2026-07-28';

function buildServer(): McpServer {
  const server = new McpServer(
    { name: 'p31-bros', version: '2.0.0' },
    {
      capabilities: { tools: {} },
      cacheHints: { 'tools/list': { ttlMs: 60_000, cacheScope: 'public' } },
    },
  );
  for (const t of BROS_TOOLS) {
    server.registerTool(
      t.name,
      { description: t.description, inputSchema: fromJsonSchema(t.inputSchema as unknown as Parameters<typeof fromJsonSchema>[0]) },
      async (args) => {
        const result = executeBrosTool(t.name, args as Record<string, unknown>);
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
      return cors(JSON.stringify(protectedResourceMetadata(_env, RESOURCE_URI, ['bros:read', 'bros:write'])));
    }

    if (url.pathname === '/.well-known/mcp/server-card.json' && method === 'GET') {
      return cors(JSON.stringify({
        $schema: 'https://schema.smithery.ai/server-card.json',
        name: 'bros',
        description: 'P31 Bros MCP — signaling rooms, persona switching, care issuance, and crisis ping for the family mesh.',
        version: '2.0.0',
        serverInfo: { name: 'p31-bros', version: '2.0.0' },
        endpoint: 'https://bros.trimtab-signal.workers.dev/mcp',
        transport: 'streamable-http',
        authentication: { type: 'none' },
        tools: BROS_TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
        resources: [],
        prompts: [],
      }));
    }

    if (url.pathname === '/mcp' && method === 'GET') {
      return cors(JSON.stringify({ service: 'p31-bros', transport: 'streamable-http', protocol: PROTOCOL_VERSION, mcp: 'POST /mcp', tools: BROS_TOOLS.map(t => t.name) }));
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
      return withCors(await mcpHandler.fetch(request));
    }

    if (url.pathname === '/health' && method === 'GET')
      return cors(JSON.stringify({ status: 'ok', service: 'bros', version: '2.0.0', tools: BROS_TOOLS.length, timestamp: new Date().toISOString() }));

    if (url.pathname === '/' && method === 'GET')
      return cors(JSON.stringify({ service: 'p31-bros', description: 'Zero-state signaling + persona-switched care issuance', tools: BROS_TOOLS.map(t => t.name), mcp: 'POST /mcp', protocol: PROTOCOL_VERSION }));

    const roomMatch = url.pathname.match(/^\/rooms\/([^/]+)(\/.*)?$/);
    if (roomMatch) {
      const roomId = roomMatch[1];
      const suffix = roomMatch[2] || '/';
      const doId = _env.SIGNALING_ROOM.idFromName(roomId);
      const roomStub = _env.SIGNALING_ROOM.get(doId);
      const rewritten = new Request(new URL(suffix, url.origin), request);
      return roomStub.fetch(rewritten);
    }

    return cors(JSON.stringify({ error: 'Not found' }), 404);
  },
};
