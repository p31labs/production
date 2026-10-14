/**
 * marketplace-mcp — MCP server for P31 Sovereign Marketplace
 *
 * Streamable HTTP MCP (JSON-RPC 2.0) exposing 10 tools
 * for listings, offers, trades, escrow, and dispute resolution.
 *
 * MCP 2026-07-28 Stateless Core (SEP-2575): no initialize handshake,
 * no Mcp-Session-Id, no ping/logging/setLevel. The hand-rolled stateless
 * dispatch was replaced by the split SDK v2
 * (`@modelcontextprotocol/server` → `McpServer` + `createMcpHandler`).
 * The SDK handler serves the modern 2026-07-28 surface (server/discover,
 * `_meta` envelope, resultType, ttlMs/cacheScope on cacheable results,
 * -32022 version mismatches) and keeps 2025-era clients working through its
 * default `legacy: 'stateless'` fallback (the initialize handshake) —
 * equivalent to the previous hand-rolled legacy-compat branch. See
 * docs/fix-plans/marketplace-mcp-sdk-v2.md.
 *
 * OAuth 2.1 resource server (see docs/fix-plans/marketplace-mcp-oauth21.md):
 * RFC 8414 AS metadata discovery, RFC 9728 protected-resource metadata,
 * RFC 8707 audience-bound bearer validation (opt-in — active only when
 * OAUTH_JWKS_URL + RESOURCE_ID are configured; unauthenticated tools stay
 * open, matching the fleet reference workers/p31-capital-machine-mcp), and
 * RFC 9207 `iss` validation. See docs/enterprise/api/oauth-21-rollout-runbook.md.
 *
 * Proxies hot state operations to MarketplaceCatalogDO.
 * Trust tier lookups go to shared love-ledger D1.
 */

import { MarketplaceCatalogDO } from '../../marketplace-catalog/src/index';
import { McpServer, createMcpHandler, fromJsonSchema } from '@modelcontextprotocol/server';

// ─── Types ────────────────────────────────────────────────────────────

export interface Listing {
  id: string;
  seller_did: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  price_love: number;
  price_usd: number;
  accepts_barter: boolean;
  images: string[];
  status: 'active' | 'sold' | 'expired' | 'draft';
  trust_tier: string;
  created_at: number;
  expires_at: number;
}

export interface Offer {
  id: string;
  listing_id: string;
  buyer_did: string;
  seller_did: string;
  offer_love: number;
  offer_usd: number;
  offer_items: string[];
  status: 'pending' | 'accepted' | 'rejected' | 'escrow' | 'completed' | 'disputed';
  escrow_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface Trade {
  id: string;
  listing_id: string;
  buyer_did: string;
  seller_did: string;
  amount_love: number;
  amount_usd: number;
  escrow_id: string | null;
  status: 'escrow' | 'shipped' | 'completed' | 'disputed';
  created_at: number;
  completed_at: number | null;
}

// ─── Protocol Constants (MCP 2026-07-28 Stateless Core) ───────────────

const PROTOCOL_VERSION = '2026-07-28';

function metaEnvelope(): { _meta: { protocolVersion: string } } {
  return { _meta: { protocolVersion: PROTOCOL_VERSION } };
}

// ─── MCP Tool Definitions ─────────────────────────────────────────────

const TOOLS = [
  {
    name: 'marketplace_list',
    description: 'List an item for sale or trade. Requires trust tier ≥ basic.',
    inputSchema: {
      type: 'object',
      properties: {
        sellerDid: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
        condition: { type: 'string', enum: ['new', 'like-new', 'good', 'fair', 'poor'] },
        priceLove: { type: 'number' },
        priceUsd: { type: 'number' },
        acceptsBarter: { type: 'boolean' },
        images: { type: 'array', items: { type: 'string' } },
      },
      required: ['sellerDid', 'title', 'category'],
    },
  },
  {
    name: 'marketplace_search',
    description: 'AI-powered search across listings. Optional category filter.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        category: { type: 'string' },
        status: { type: 'string', default: 'active' },
        limit: { type: 'number', default: 50 },
      },
      required: ['query'],
    },
  },
  {
    name: 'marketplace_get',
    description: 'Get full listing details by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        listingId: { type: 'string' },
      },
      required: ['listingId'],
    },
  },
  {
    name: 'marketplace_offer',
    description: 'Submit a barter or cash offer on a listing.',
    inputSchema: {
      type: 'object',
      properties: {
        listingId: { type: 'string' },
        buyerDid: { type: 'string' },
        offerLove: { type: 'number' },
        offerUsd: { type: 'number' },
        offerItems: { type: 'array', items: { type: 'string' } },
      },
      required: ['listingId', 'buyerDid'],
    },
  },
  {
    name: 'marketplace_accept',
    description: 'Accept an offer and move to escrow.',
    inputSchema: {
      type: 'object',
      properties: {
        offerId: { type: 'string' },
      },
      required: ['offerId'],
    },
  },
  {
    name: 'marketplace_reject',
    description: 'Reject an offer.',
    inputSchema: {
      type: 'object',
      properties: {
        offerId: { type: 'string' },
      },
      required: ['offerId'],
    },
  },
  {
    name: 'marketplace_escrow_status',
    description: 'Check escrow status for a trade.',
    inputSchema: {
      type: 'object',
      properties: {
        tradeId: { type: 'string' },
      },
      required: ['tradeId'],
    },
  },
  {
    name: 'marketplace_confirm',
    description: 'Confirm receipt and release escrow.',
    inputSchema: {
      type: 'object',
      properties: {
        tradeId: { type: 'string' },
      },
      required: ['tradeId'],
    },
  },
  {
    name: 'marketplace_dispute',
    description: 'File a dispute on a trade with evidence.',
    inputSchema: {
      type: 'object',
      properties: {
        tradeId: { type: 'string' },
        evidence: { type: 'string', description: 'SHA-256 hash of evidence payload' },
      },
      required: ['tradeId', 'evidence'],
    },
  },
  {
    name: 'marketplace_history',
    description: 'Get trade history for a user.',
    inputSchema: {
      type: 'object',
      properties: {
        did: { type: 'string' },
      },
      required: ['did'],
    },
  },
];

// Offer-lifecycle tools gated by the OAuth 2.1 bearer gate when an
// authorization server is configured (runbook §3 marketplace row:
// "gate offer mutation tools"). See docs/fix-plans/marketplace-mcp-oauth21.md.
const OFFER_MUTATION_TOOLS = new Set(['marketplace_offer', 'marketplace_accept', 'marketplace_reject']);

// ─── Helpers ──────────────────────────────────────────────────────────

function corsResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Mcp-Method, Mcp-Name, MCP-Protocol-Version, Authorization',
    },
  });
}

// Stateless JSON-RPC envelope — no Mcp-Session-Id (removed by SEP-2567).
function mcpError(id: any, code: number, message: string): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, ...metaEnvelope(), error: { code, message } }), {
    status: 400,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Mcp-Method, Mcp-Name, MCP-Protocol-Version, Authorization',
    },
  });
}

/** Envelope-shaped 401 for the OAuth gate (RFC 8707 / runbook §3 Step 3). */
function mcpAuthReject(id: any, message: string): Response {
  return new Response(JSON.stringify({
    jsonrpc: '2.0',
    id,
    ...metaEnvelope(),
    result: {
      resultType: 'complete',
      content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
      isError: true,
    },
  }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Mcp-Method, Mcp-Name, MCP-Protocol-Version, Authorization',
    },
  });
}

// ─── DO Helper Class (inline for MCP server) ──────────────────────────

class CatalogProxy {
  constructor(private env: Env) {}

  private async getDO(): Promise<any> {
    const id = this.env.CATALOG_DO.idFromName('main');
    const stub = this.env.CATALOG_DO.get(id);
    return stub;
  }

  async searchListings(params: { category?: string; status?: string; limit?: number }): Promise<any> {
    const stub = await this.getDO();
    const url = new URL('http://internal/search');
    if (params.category) url.searchParams.set('category', params.category);
    if (params.status) url.searchParams.set('status', params.status);
    url.searchParams.set('limit', String(params.limit || 50));
    const res = await stub.fetch(url.toString());
    return res.json();
  }

  async getListing(id: string): Promise<any> {
    const stub = await this.getDO();
    const res = await stub.fetch(`http://internal/listing/${id}`);
    return res.json();
  }

  async createListing(listing: any): Promise<any> {
    const stub = await this.getDO();
    const res = await stub.fetch('http://internal/list', {
      method: 'POST',
      body: JSON.stringify(listing),
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  }

  async createOffer(offer: any): Promise<any> {
    const stub = await this.getDO();
    const res = await stub.fetch('http://internal/offer', {
      method: 'POST',
      body: JSON.stringify(offer),
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  }

  async acceptOffer(id: string): Promise<any> {
    const stub = await this.getDO();
    const res = await stub.fetch(`http://internal/offer/${id}/accept`, { method: 'POST' });
    return res.json();
  }

  async rejectOffer(id: string): Promise<any> {
    const stub = await this.getDO();
    const res = await stub.fetch(`http://internal/offer/${id}/reject`, { method: 'POST' });
    return res.json();
  }

  async getOffersForListing(listingId: string): Promise<any> {
    const stub = await this.getDO();
    const res = await stub.fetch(`http://internal/offers/listing/${listingId}`);
    return res.json();
  }

  async getTradeHistory(did: string): Promise<any> {
    const stub = await this.getDO();
    const res = await stub.fetch(`http://internal/trades/${did}`);
    return res.json();
  }

  // Trade state (status + escrow lifecycle + SBT mint flag) by trade id.
  async getTradeStatus(id: string): Promise<any> {
    const stub = await this.getDO();
    const res = await stub.fetch(`http://internal/trade/${id}/sbt`);
    return res.json();
  }

  // Phase-1 confirm: write the trade-confirm record (completed_at) through
  // the DO, which also mints the SBT and releases Justice Hub escrow.
  async completeTrade(id: string): Promise<any> {
    const stub = await this.getDO();
    const res = await stub.fetch(`http://internal/trade/${id}/complete`, { method: 'POST' });
    return res.json();
  }

  // Dispute: DO-local dispute record (trade status -> 'disputed'). The DO also
  // attempts Justice Hub ODR forwarding from its own env bindings.
  async disputeTrade(id: string, evidence: string): Promise<any> {
    const stub = await this.getDO();
    const res = await stub.fetch(`http://internal/trade/${id}/dispute`, {
      method: 'POST',
      body: JSON.stringify({ evidence }),
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  }
}

// ─── Tool Execution ───────────────────────────────────────────────────

async function executeTool(name: string, args: any, env: Env): Promise<any> {
  const catalog = new CatalogProxy(env);

  switch (name) {
    case 'marketplace_list': {
      const required = ['sellerDid', 'title', 'category'];
      for (const field of required) {
        if (!args[field]) return { error: `Missing required field: ${field}` };
      }
      const listing = {
        seller_did: args.sellerDid,
        title: args.title,
        description: args.description || '',
        category: args.category,
        condition: args.condition || 'good',
        price_love: args.priceLove || 0,
        price_usd: args.priceUsd || 0,
        accepts_barter: args.acceptsBarter || false,
        images: args.images || [],
      };
      return await catalog.createListing(listing);
    }

    case 'marketplace_search': {
      const results = await catalog.searchListings({
        category: args.category,
        status: args.status || 'active',
        limit: args.limit || 50,
      });
      return { listings: results.listings, count: results.count, query: args.query };
    }

    case 'marketplace_get': {
      if (!args.listingId) return { error: 'listingId required' };
      return await catalog.getListing(args.listingId);
    }

    case 'marketplace_offer': {
      const required = ['listingId', 'buyerDid'];
      for (const field of required) {
        if (!args[field]) return { error: `Missing required field: ${field}` };
      }
      return await catalog.createOffer({
        listing_id: args.listingId,
        buyer_did: args.buyerDid,
        seller_did: args.sellerDid || '',
        offer_love: args.offerLove || 0,
        offer_usd: args.offerUsd || 0,
        offer_items: args.offerItems || [],
      });
    }

    case 'marketplace_accept': {
      if (!args.offerId) return { error: 'offerId required' };
      return await catalog.acceptOffer(args.offerId);
    }

    case 'marketplace_reject': {
      if (!args.offerId) return { error: 'offerId required' };
      return await catalog.rejectOffer(args.offerId);
    }

    case 'marketplace_escrow_status': {
      if (!args.tradeId) return { error: 'tradeId required' };
      const state = await catalog.getTradeStatus(args.tradeId);
      if (state?.error) {
        return { tradeId: args.tradeId, status: 'not_found', error: state.error };
      }
      return {
        tradeId: args.tradeId,
        status: state.status ?? 'unknown',
        escrowState: state.status ?? 'unknown',
        sbtMinted: state.sbtMinted ?? false,
        buyerDid: state.buyerDid,
      };
    }

    case 'marketplace_confirm': {
      if (!args.tradeId) return { error: 'tradeId required' };
      const result = await catalog.completeTrade(args.tradeId);
      return {
        tradeId: args.tradeId,
        confirmed: !result?.error,
        status: result?.status ?? 'completed',
        error: result?.error,
      };
    }

    case 'marketplace_dispute': {
      if (!args.tradeId) return { error: 'tradeId required' };
      if (!args.evidence) return { error: 'evidence required' };
      const result = await catalog.disputeTrade(args.tradeId, args.evidence);
      return {
        tradeId: args.tradeId,
        status: result?.status ?? 'disputed',
        evidence: args.evidence,
        disputeRecord: 'DO-local',
        error: result?.error,
      };
    }

    case 'marketplace_history': {
      if (!args.did) return { error: 'did required' };
      return await catalog.getTradeHistory(args.did);
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ─── MCP 2026-07-28 (SDK v2) ──────────────────────────────────────────

const LIST_TTL_MS = 60_000;

function buildServer(env: Env): McpServer {
  const server = new McpServer(
    { name: 'marketplace-mcp', version: '1.0.0' },
    {
      capabilities: { tools: {} },
      cacheHints: { 'tools/list': { ttlMs: LIST_TTL_MS, cacheScope: 'public' } },
    },
  );
  for (const t of TOOLS) {
    server.registerTool(
      t.name,
      { description: t.description, inputSchema: fromJsonSchema(t.inputSchema as unknown as Parameters<typeof fromJsonSchema>[0]) },
      async (args) => {
        const result = await executeTool(t.name, (args ?? {}) as Record<string, unknown>, env);
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
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Mcp-Method, Mcp-Name, MCP-Protocol-Version, Authorization');
  return new Response(res.body, { status: res.status, headers });
}

// ---------------------------------------------------------------------------
// OAuth 2.1 resource-server validation (RFC 8707 audience binding + RFC 9207
// issuer identification). Validates externally-issued bearer tokens against a
// fetched JWKS using WebCrypto (RS256 / ES256 / Ed25519). Zero new
// dependencies. Ported from the fleet reference
// workers/p31-capital-machine-mcp/src/index.ts (incl. its `iss` hardening).
// Opt-in: the gate only activates when OAUTH_JWKS_URL + RESOURCE_ID are set.
// ---------------------------------------------------------------------------

const JWKS_CACHE_TTL_MS = 15 * 60 * 1000;
let jwksCache: { source: string; fetchedAt: number; keys: Record<string, JsonWebKey> } | null = null;

/** Base64url → base64, then decode to a string. */
function b64urlDecode(s: string): string {
  const base64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  return atob(base64);
}

/** Base64url → bytes (ArrayBuffer-backed Uint8Array). */
function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const binary = b64urlDecode(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Decode (without verifying) a JWT into header + payload. Returns null on malformed input. */
function decodeJwt(token: string): { header: { kid?: string; alg?: string }; payload: Record<string, unknown> } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(b64urlDecode(parts[0])) as { kid?: string; alg?: string };
    const payload = JSON.parse(b64urlDecode(parts[1])) as Record<string, unknown>;
    if (!header || typeof header !== "object" || !payload || typeof payload !== "object") return null;
    return { header, payload };
  } catch {
    return null;
  }
}

/** Fetch (with 15-min module-level cache) the JWKS for an IdP, keyed by kid. */
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
    if (jwk && typeof jwk.kid === "string") keys[jwk.kid] = jwk;
  }
  jwksCache = { source, fetchedAt: now, keys };
  return keys;
}

/** WebCrypto algorithm descriptor for a supported JWS alg. */
function webAlg(jwk: JsonWebKey, alg: string): { name: string; hash?: string; namedCurve?: string } {
  if (alg === "ES256") return { name: "ECDSA", namedCurve: (jwk.crv as string) || "P-256" };
  if (alg === "Ed25519") return { name: "Ed25519" };
  return { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
}

/** Verify a JWS signature over `signedData` with WebCrypto. Never throws. */
async function verifySignature(jwk: JsonWebKey, alg: string, signedData: Uint8Array<ArrayBuffer>, signature: Uint8Array<ArrayBuffer>): Promise<boolean> {
  const algSpec = webAlg(jwk, alg);
  try {
    const key = await crypto.subtle.importKey("jwk", jwk, algSpec as Algorithm, false, ["verify"]);
    return await crypto.subtle.verify(algSpec as Algorithm, key, signature, signedData);
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
    const auth = request.headers.get("Authorization");
    if (!auth || !auth.startsWith("Bearer ")) return null;
    const token = auth.slice(7).trim();
    if (!token || !env.OAUTH_JWKS_URL || !env.RESOURCE_ID) return null;

    const decoded = decodeJwt(token);
    if (!decoded) return null;

    const alg = decoded.header.alg ?? "";
    if (alg !== "RS256" && alg !== "ES256" && alg !== "Ed25519") return null;
    const kid = decoded.header.kid;
    if (!kid) return null;

    const keys = await fetchJwksKeys(env.OAUTH_JWKS_URL);
    const jwk = keys[kid];
    if (!jwk) return null;

    const parts = token.split(".");
    const signedData = new TextEncoder().encode(`${parts[0]}.${parts[1]}`) as Uint8Array<ArrayBuffer>;
    const signature = b64urlToBytes(parts[2]) as Uint8Array<ArrayBuffer>;
    if (!(await verifySignature(jwk, alg, signedData, signature))) return null;

    const payload = decoded.payload;
    const exp = payload.exp;
    if (typeof exp !== "number" || exp <= Math.floor(Date.now() / 1000)) return null;

    // RFC 8707: the token's audience MUST be bound to our resource.
    const aud = payload.aud;
    const audOk = Array.isArray(aud) ? aud.includes(env.RESOURCE_ID) : aud === env.RESOURCE_ID;
    if (!audOk) return null;

    // RFC 9207: the token's issuer MUST match our configured authorization
    // server (explicit OAUTH_ISSUER wins; otherwise derive from the JWKS URL).
    // This closes the issuer-substitution / mix-up gap — a token minted by a
    // different AS that happens to share our JWKS/aud is rejected here.
    const iss = payload.iss;
    const expectedIssuer = env.OAUTH_ISSUER ?? issuerFromJwks(env.OAUTH_JWKS_URL) ?? null;
    if (typeof iss !== "string" || !expectedIssuer || iss !== expectedIssuer) return null;

    return { sub: String(payload.sub ?? ""), scope: typeof payload.scope === "string" ? payload.scope : undefined };
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

// ─── Streamable HTTP MCP Server ───────────────────────────────────────

export interface Env {
  CATALOG_DO: DurableObjectNamespace;
  LOVE_DB: D1Database;
  /**
   * RFC 8707 resource URI that a valid bearer token's `aud` claim MUST match.
   * When unset, the OAuth bearer gate is inactive (open access, today's
   * behavior). Single source of truth for the RFC 9728 metadata `resource`.
   */
  RESOURCE_ID?: string;
  /** External OAuth 2.1 IdP JWKS endpoint (fleet oauth-relay). Optional — when absent, bearer validation is disabled. */
  OAUTH_JWKS_URL?: string;
  /**
   * RFC 9207 expected token issuer. When set, a valid bearer token's `iss`
   * claim MUST equal this value exactly; when unset, falls back to the origin
   * derived from OAUTH_JWKS_URL (issuerFromJwks).
   */
  OAUTH_ISSUER?: string;
}

/** This worker's resource URI (RFC 8707 `aud` / RFC 9728 `resource`). */
const RESOURCE_URI = 'https://marketplace-mcp.trimtab-signal.workers.dev/mcp';
/** Fleet authorization server (oauth-relay) for metadata discovery. */
const FLEET_AS_ISSUER = 'https://oauth-relay.trimtab-signal.workers.dev';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // CORS
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Mcp-Method, Mcp-Name, MCP-Protocol-Version, Authorization',
        },
      });
    }

    // RFC 8414 — authorization-server metadata discovery. This worker is a
    // pure resource server: the metadata points at the fleet AS (oauth-relay)
    // and advertises the resource URI whose `aud` claims it validates.
    if (url.pathname === '/.well-known/oauth-authorization-server' && method === 'GET') {
      const issuer = issuerFromJwks(env.OAUTH_JWKS_URL ?? '') ?? FLEET_AS_ISSUER;
      return corsResponse(JSON.stringify({
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        jwks_uri: env.OAUTH_JWKS_URL ?? `${FLEET_AS_ISSUER}/.well-known/jwks.json`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code'],
        token_endpoint_auth_methods_supported: ['none'],
        code_challenge_methods_supported: ['S256'],
        resource: env.RESOURCE_ID ?? RESOURCE_URI,
      }));
    }

    // RFC 9728 — protected-resource metadata (canonical route + alias).
    if ((url.pathname === '/.well-known/resource-server' || url.pathname === '/.well-known/oauth-protected-resource') && method === 'GET') {
      const issuer = issuerFromJwks(env.OAUTH_JWKS_URL ?? '') ?? FLEET_AS_ISSUER;
      return corsResponse(JSON.stringify({
        resource: env.RESOURCE_ID ?? RESOURCE_URI,
        authorization_servers: [issuer],
        scopes_supported: ['marketplace:read', 'marketplace:write'],
      }));
    }

    // MCP Server Card (Smithery discovery)
    if (url.pathname === '/.well-known/mcp/server-card.json' && method === 'GET') {
      return corsResponse(JSON.stringify({
        $schema: 'https://schema.smithery.ai/server-card.json',
        name: 'marketplace-mcp',
        description: 'P31 Marketplace MCP — list, search, and trade LOVE/USD with barter, escrow, and dispute resolution.',
        version: '1.0.0',
        serverInfo: { name: 'marketplace-mcp', version: '1.0.0' },
        endpoint: 'https://marketplace-mcp.trimtab-signal.workers.dev/mcp',
        transport: 'streamable-http',
        authentication: { type: 'none' },
        tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
        resources: [],
        prompts: [],
      }));
    }

    // Streamable HTTP: GET /mcp returns stateless JSON metadata (SEP-2575 —
    // the legacy SSE notification stream is gone from the main path).
    if (url.pathname === '/mcp' && method === 'GET') {
      return corsResponse(JSON.stringify({
        service: 'p31-marketplace-mcp',
        transport: 'streamable-http',
        protocol: PROTOCOL_VERSION,
        mcp: 'POST /mcp',
        tools: TOOLS.map((t) => t.name),
      }));
    }

    // Streamable HTTP: POST /mcp for JSON-RPC 2.0 — served by the SDK v2
    // handler, behind the opt-in OAuth 2.1 bearer gate on tools/call.
    if (url.pathname === '/mcp' && method === 'POST') {
      let body: any;
      try {
        body = await request.json<any>();
      } catch (e: any) {
        return mcpError(null, -32700, `Parse error: ${e.message}`);
      }

      const rpcId = body?.id;

      // OAuth 2.1 resource-server gate (opt-in via OAUTH_JWKS_URL +
      // RESOURCE_ID). When configured: a supplied bearer token MUST validate
      // (RFC 8707 audience binding, RFC 9207 iss); offer mutation tools
      // require a valid token (runbook do-not: no fail-open on gated tools).
      // Without a configured AS, current open access is preserved unchanged.
      const oauthEnabled = Boolean(env.OAUTH_JWKS_URL && env.RESOURCE_ID);
      if (oauthEnabled && body?.method === 'tools/call') {
        const toolName = body?.params?.name ?? '';
        const auth = request.headers.get('Authorization') ?? '';
        if (auth.startsWith('Bearer ')) {
          const bearer = await verifyOAuthBearer(request, env);
          if (bearer === null) {
            return mcpAuthReject(rpcId, 'invalid or unauthorized bearer token (RFC 8707 aud binding)');
          }
        } else if (OFFER_MUTATION_TOOLS.has(toolName)) {
          return mcpAuthReject(rpcId, `bearer token required for ${toolName} (RFC 8707 audience-bound OAuth 2.1)`);
        }
      }

      // Delegate to the SDK v2 stateless handler. The body was read above, so
      // hand it over as parsedBody (the SDK never re-reads the consumed
      // stream). The handler is built per request so tool callbacks close
      // over this request's `env` (DO bindings).
      const handler = createMcpHandler(() => buildServer(env));
      return withCors(await handler.fetch(request, { parsedBody: body ?? undefined }));
    }

    // Health
    if (url.pathname === '/health' && method === 'GET') {
      return corsResponse(JSON.stringify({
        status: 'ok',
        service: 'marketplace-mcp',
        version: '1.0.0',
        protocolVersion: PROTOCOL_VERSION,
        tools: TOOLS.length,
        timestamp: new Date().toISOString(),
      }));
    }

    // Root
    if (url.pathname === '/' && method === 'GET') {
      return corsResponse(JSON.stringify({
        service: 'p31-marketplace-mcp',
        protocolVersion: PROTOCOL_VERSION,
        tools: TOOLS.map(t => t.name),
        mcp: 'POST /mcp (JSON-RPC 2.0), GET /mcp (JSON metadata)',
      }));
    }

    return corsResponse(JSON.stringify({ error: 'Not found' }), 404);
  },
};

export { MarketplaceCatalogDO };