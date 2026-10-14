/**
 * p31-capital-machine-mcp — x402-gated MCP server for the P31 Capital Machine.
 *
 * Exposes the capital-machine surfaces as MCP tools over streamable HTTP.
 * Paid tools answer unpaid requests with a real HTTP 402 Payment Required
 * challenge (x402-hono + @coinbase/x402 facilitator); settlement lands in the
 * revenue ledger. Free tools stay open for discovery.
 *
 * Discovery:
 *   GET /.well-known/mcp           server metadata
 *   GET /.well-known/mcp-pricing   per-tool pricing
 *   POST /mcp                      MCP JSON-RPC (stateless 2026-07-28:
 *                                  server/discover | tools/list | tools/call;
 *                                  a deprecated legacy branch still answers
 *                                  2025-era initialize / initialized)
 */

import { Hono } from "hono";
import { paymentMiddleware } from "x402-hono";
import { createFacilitatorConfig } from "@coinbase/x402";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { McpServer, createMcpHandler, fromJsonSchema } from "@modelcontextprotocol/server";

/** Build a Bazaar discovery declaration for a paid MCP tool (v1 body carries it; buyer clients echo it into the envelope). */
function bazaarDeclaration(description: string, input: Record<string, unknown>) {
  return declareDiscoveryExtension({
    bodyType: "json",
    inputSchema: { type: "object", properties: input, additionalProperties: false },
    output: { schema: { type: "object" } },
  }).bazaar;
}

/** Enrich a 402 challenge body with extensions.bazaar so the buyer's client copies it into the PAYMENT-SIGNATURE envelope (the only thing Bazaar reads). */
async function enrich402(res: Response, description: string, input: Record<string, unknown>): Promise<Response> {
  if (res.status !== 402) return res;
  try {
    const body = (await res.clone().json()) as { accepts?: Array<Record<string, unknown>> };
    const bazaar = bazaarDeclaration(description, input);
    if (Array.isArray(body.accepts)) {
      for (const a of body.accepts) {
        const extra = (a.extra ?? {}) as Record<string, unknown>;
        extra.bazaar = bazaar;
        a.extra = extra;
      }
    }
    const out = body as Record<string, unknown>;
    out.extensions = { bazaar };
    return new Response(JSON.stringify(out), { status: 402, headers: res.headers });
  } catch {
    return res;
  }
}

interface Env {
  PAY_TO: string;
  NETWORK: string;
  FACILITATOR_URL: string;
  FACILITATOR_KEY_ID?: string;
  FACILITATOR_SECRET_KEY?: string;
  PORTAL_URL: string;
  REVENUE_LEDGER_URL?: string;
  ENTITLEMENT_URL?: string;
  /** Service bindings (preferred). Public worker→worker subrequests fail on this account. */
  REVENUE_LEDGER?: Fetcher;
  ENTITLEMENT?: Fetcher;
  PORTAL?: Fetcher;
  /** operator-gated capital tools require this bearer token (set via `wrangler secret put OPERATOR_TOKEN`). */
  OPERATOR_TOKEN?: string;
  /** External OAuth 2.1 IdP JWKS endpoint (set via `wrangler secret put OAUTH_JWKS_URL`). Optional — when absent, bearer validation is disabled. */
  OAUTH_JWKS_URL?: string;
  /**
   * RFC 9207 expected token issuer. When set, a valid bearer token's `iss`
   * claim MUST equal this value exactly; when unset, falls back to the origin
   * derived from OAUTH_JWKS_URL (issuerFromJwks).
   */
  OAUTH_ISSUER?: string;
  /** RFC 8707 resource URI that a valid bearer token's `aud` claim MUST match. */
  RESOURCE_ID: string;
}

type AppContext = { Bindings: Env };

interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  price?: string;
}

/** Paid tools carry a per-call USDC price; the rest are free for discovery. */
const TOOLS: ToolDef[] = [
  {
    name: "revenue.getSummary",
    description: "x402 revenue summary (USDC/EUR/LOVE totals, transaction count) with optional source + range filters.",
    inputSchema: { type: "object", properties: { source: { type: "string" }, range: { type: "string" } }, additionalProperties: false },
    price: "0.02",
  },
  {
    name: "positions.list",
    description: "Active auto-compounder positions (protocol, chain, amount, apy_bps).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    price: "0.01",
  },
  {
    name: "opportunities.scan",
    description: "MEV arbitrage opportunities, optionally filtered by chain or status.",
    inputSchema: { type: "object", properties: { chain: { type: "string" }, status: { type: "string" } }, additionalProperties: false },
    price: "0.01",
  },
  {
    name: "entitlement.check",
    description: "Check a DID's entitlement for a tool at an estimated cost (free).",
    inputSchema: { type: "object", properties: { did: { type: "string" }, tool_id: { type: "string" }, estimated_cost_usdc: { type: "string" } }, required: ["did", "tool_id", "estimated_cost_usdc"], additionalProperties: false },
  },
  {
    name: "billing.listTiers",
    description: "Billing tier plans and allowances (free).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "allocator.rebalance",
    description: "Trigger a capital allocation rebalance. Operator-gated and x402-paid; routing fee $0.10.",
    inputSchema: {
      type: "object",
      properties: { risk_profile: { type: "string" }, max_slippage: { type: "string" } },
      additionalProperties: false,
    },
    price: "0.10",
  },
  {
    name: "compounder.trigger",
    description: "Compound active yield positions on demand. Operator-gated and x402-paid; routing fee $0.05.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    price: "0.05",
  },
  {
    name: "opportunities.execute",
    description: "Execute a scanned MEV arbitrage opportunity. Operator-gated and x402-paid; routing fee $0.25. Spend: max_spend defaults to $10; >$100 requires confirmOverLimit=true.",
    inputSchema: {
      type: "object",
      properties: {
        opportunity_id: { type: "string" },
        chain: { type: "string" },
        gas_estimate: { type: "string" },
        max_spend: { type: "string", description: "Max capital (USD) to deploy for this operation" },
        confirmOverLimit: { type: "boolean", description: "Required when max_spend exceeds $100" },
      },
      required: ["opportunity_id"],
      additionalProperties: false,
    },
    price: "0.25",
  },
  {
    name: "allocator.status",
    description: "Capital allocator health and last-rebalance status (free).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "compounder.status",
    description: "Auto-compounder status: active position count and total deposited (free).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "health",
    description: "Capital Machine MCP health (free).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

const TIERS = [
  { id: "free", name: "Starter", price: "0", allowance: "0", calls: 100, feature: "Soulbound LOVE access" },
  { id: "pro", name: "Pro", price: "50", allowance: "50", calls: 1000, feature: "2x burst, more endpoints" },
  { id: "enterprise", name: "Enterprise", price: "500", allowance: "500", calls: 10000, feature: "5x burst, dedicated allocation" },
];

const PRICING = Object.fromEntries(
  TOOLS.filter((t) => t.price).map((t) => [t.name, t]),
) as Record<string, ToolDef>;

/** Capital-operation tools require the operator bearer token on top of x402 payment. */
const OPERATOR_TOOLS = new Set(["allocator.rebalance", "compounder.trigger", "opportunities.execute"]);

/** Default spend cap (USD) for a capital operation; above DEFAULT_SPEND_OVER needs explicit confirmation. */
const DEFAULT_SPEND_CAP_USD = 10;
const CONFIRM_OVER_USD = 100;

// ─── MCP 2026-07-28 (SDK v2) ───────────────────────────────────────────
// The hand-rolled stateless dispatch was replaced by the split SDK v2
// (`@modelcontextprotocol/server` → `McpServer` + `createMcpHandler`).
// The SDK handler serves the modern 2026-07-28 surface (server/discover,
// `_meta` envelope, resultType, ttlMs/cacheScope on cacheable results,
// -32022 version mismatches) and keeps 2025-era clients working through its
// default `legacy: 'stateless'` fallback (the initialize handshake) —
// equivalent to the previous hand-rolled legacy-compat branch.
// The x402 payment gate and the OAuth 2.1 / RFC 8707 bearer validation
// (verifyOAuthBearer above) are unchanged and stay on the tools/call path
// as middleware BEFORE the SDK handler (answered with the envelope-shaped
// `mcpResult`/`mcpErr` bodies below).

const PROTOCOL_VERSION = "2026-07-28";
const META_PROTOCOL = "io.modelcontextprotocol/protocolVersion";

function metaEnvelope() {
  return { _meta: { [META_PROTOCOL]: PROTOCOL_VERSION } };
}

/** Envelope-shaped bodies for the auth-gate responses (kept from the hand-rolled era). */
function mcpResult(id: any, result: any) {
  return { jsonrpc: "2.0", id, ...metaEnvelope(), result: { resultType: "complete", ...result } };
}

function mcpErr(id: any, code: number, message: string) {
  return { jsonrpc: "2.0", id, ...metaEnvelope(), error: { code, message } };
}

/** ExecutionContext hand-off: the SDK tool callback has no `c.executionCtx`, so the Hono route stashes it keyed by request. */
const execCtxByRequest = new WeakMap<Request, ExecutionContext>();

/** Fire-and-forget settlement record without an ExecutionContext (legacy-leg fallback). */
function detached(p: Promise<unknown>): void {
  void p.catch((e) => console.error("background record failed", String(e)));
}

function buildServer(env: Env): McpServer {
  const server = new McpServer(
    { name: "p31-capital-machine", version: "0.1.0-beta" },
    {
      capabilities: { tools: {} },
      cacheHints: { "tools/list": { ttlMs: 60_000, cacheScope: "public" } },
    },
  );
  for (const t of TOOLS) {
    const priced = PRICING[t.name];
    server.registerTool(
      t.name,
      { description: t.description, inputSchema: fromJsonSchema(t.inputSchema as unknown as Parameters<typeof fromJsonSchema>[0]) },
      async (args, ctx) => {
        const req = ctx.http?.req;
        const did = req ? (req.headers.get("X-DID") || req.headers.get("X-User-DID")) : "";
        const result = await executeTool(t.name, (args ?? {}) as Record<string, unknown>, env);

        if (priced) {
          const routingFee = priced.price ?? "0.01";
          const execCtx = req ? execCtxByRequest.get(req) : undefined;
          const ctxLike = execCtx ?? ({ waitUntil: detached, passThroughOnException: () => {} } as unknown as ExecutionContext);
          recordX402Revenue(env, t.name, did ?? "", routingFee, ctxLike, {
            routing_fee: routingFee,
            operation: t.name,
          });
          consumeEntitlement(env, did ?? "", t.name, routingFee, ctxLike);
        }

        return {
          content: [{ type: "text", text: result.ok ? JSON.stringify(result.data) : JSON.stringify({ error: result.error }) }],
          isError: !result.ok,
        };
      },
    );
  }
  return server;
}

/** The SDK handler does not add CORS headers — re-apply the worker's own. */
function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-PAYMENT, X-Operator-Token");
  return new Response(res.body, { status: res.status, headers });
}

/** Enforce spend limits on capital operations (mirrors si-wallet-mcp mandate pattern). */
function enforceSpendLimit(name: string, args: Record<string, unknown>): string | null {
  if (!OPERATOR_TOOLS.has(name)) return null;
  if (name !== "opportunities.execute") return null;
  const maxSpend = parseFloat(String(args.max_spend ?? "10")) || 0;
  if (maxSpend > CONFIRM_OVER_USD && args.confirmOverLimit !== true) {
    return `operation exceeds $${CONFIRM_OVER_USD} — set confirmOverLimit=true (owner approval required)`;
  }
  if (maxSpend > DEFAULT_SPEND_CAP_USD && maxSpend <= CONFIRM_OVER_USD) {
    // within the operator's discretion band — operator token already gates this call
    return null;
  }
  return null;
}

function facilitator(c: Env, version: "v1" | "v2") {
  const url = c.FACILITATOR_URL as `${string}://${string}`;
  if (c.FACILITATOR_KEY_ID && c.FACILITATOR_SECRET_KEY) {
    const cfg = createFacilitatorConfig(c.FACILITATOR_KEY_ID, c.FACILITATOR_SECRET_KEY);
    const createAuthHeaders = cfg.createAuthHeaders as (config?: Record<string, unknown>) => Promise<{
      verify: Record<string, string>;
      settle: Record<string, string>;
      supported: Record<string, string>;
      list?: Record<string, string>;
    }>;
    if (version === "v2") return { url, createAuthHeaders, version: "v2" as const };
    return { url, createAuthHeaders };
  }
  if (version === "v2") return { url, version: "v2" as const };
  return { url };
}

async function recordX402Revenue(env: Env, toolName: string, did: string, price: string, ctx: ExecutionContext, extra?: Record<string, unknown>) {
  if ((!env.REVENUE_LEDGER && !env.REVENUE_LEDGER_URL) || !env.PAY_TO) return;
  const url = env.REVENUE_LEDGER ? "https://revenue-ledger.internal/revenue/record" : `${env.REVENUE_LEDGER_URL}/revenue/record`;
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "x402",
      payer_did: did || "did:agent:unknown",
      merchant_did: env.PAY_TO,
      amount_usdc: price,
      asset: "USDC",
      metadata: { tool: toolName, network: env.NETWORK, mcp: "p31-capital-machine", ...extra },
    }),
  };
  const p = env.REVENUE_LEDGER ? env.REVENUE_LEDGER.fetch(url, init) : fetch(url, init);
  ctx.waitUntil(p.then((r) => console.log(`ledger record ${r.status}`)).catch((e) => console.error("ledger record failed", String(e))));
}

async function consumeEntitlement(env: Env, did: string, toolName: string, price: string, ctx: ExecutionContext) {
  if ((!env.ENTITLEMENT && !env.ENTITLEMENT_URL) || !did) return;
  const url = env.ENTITLEMENT ? "https://entitlement.internal/entitlement/consume" : `${env.ENTITLEMENT_URL}/entitlement/consume`;
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ did, tool_id: toolName, amount_usdc: price, tx_hash: `x402-${toolName}-${crypto.randomUUID()}` }),
  };
  const p = env.ENTITLEMENT ? env.ENTITLEMENT.fetch(url, init) : fetch(url, init);
  ctx.waitUntil(p.then((r) => console.log(`entitlement consume ${r.status}`)).catch((e) => console.error("entitlement consume failed", String(e))));
}

/** Thin proxy over the capital-machine portal (via service binding; public subrequest falls back to PORTAL_URL). */
async function portalFetch(env: Env, path: string, init?: RequestInit): Promise<Response> {
  const url = env.PORTAL ? `https://p31-monetization.internal${path}` : `${env.PORTAL_URL}${path}`;
  return env.PORTAL ? env.PORTAL.fetch(url, init) : fetch(url, init);
}

/** Tool execution — thin proxy over the capital-machine portal API. */
async function executeTool(name: string, args: Record<string, unknown>, env: Env): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  switch (name) {
    case "revenue.getSummary": {
      const qs = new URLSearchParams();
      if (args.source) qs.set("source", String(args.source));
      qs.set("range", String(args.range ?? "30d"));
      const res = await portalFetch(env, `/api/revenue/summary?${qs}`);
      if (!res.ok) return { ok: false, error: `revenue/summary HTTP ${res.status}` };
      return { ok: true, data: await res.json() };
    }
    case "positions.list": {
      const res = await portalFetch(env, `/api/auto-compounder/positions`);
      if (!res.ok) return { ok: false, error: `positions HTTP ${res.status}` };
      return { ok: true, data: await res.json() };
    }
    case "opportunities.scan": {
      const qs = new URLSearchParams();
      if (args.chain) qs.set("chain", String(args.chain));
      qs.set("status", String(args.status ?? "pending"));
      const res = await portalFetch(env, `/api/mev-arbitrage/opportunities?${qs}`);
      if (!res.ok) return { ok: false, error: `opportunities HTTP ${res.status}` };
      return { ok: true, data: await res.json() };
    }
    case "entitlement.check": {
      const res = await portalFetch(env, `/api/entitlement/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          did: String(args.did ?? ""),
          tool_id: String(args.tool_id ?? ""),
          estimated_cost_usdc: String(args.estimated_cost_usdc ?? "0"),
        }),
      });
      if (!res.ok && res.status !== 402) return { ok: false, error: `entitlement HTTP ${res.status}` };
      return { ok: true, data: await res.json() };
    }
    case "billing.listTiers":
      return { ok: true, data: { tiers: TIERS } };
    case "allocator.rebalance": {
      const res = await portalFetch(env, `/api/allocator/rebalance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      if (!res.ok) return { ok: false, error: `allocator/rebalance HTTP ${res.status}` };
      return { ok: true, data: await res.json() };
    }
    case "compounder.trigger": {
      const res = await portalFetch(env, `/api/auto-compounder/compound`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) return { ok: false, error: `compound HTTP ${res.status}` };
      return { ok: true, data: await res.json() };
    }
    case "opportunities.execute": {
      const res = await portalFetch(env, `/api/mev-arbitrage/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      if (!res.ok) return { ok: false, error: `opportunities/execute HTTP ${res.status}` };
      return { ok: true, data: await res.json() };
    }
    case "allocator.status": {
      const res = await portalFetch(env, `/api/allocator/health`);
      if (!res.ok) return { ok: false, error: `allocator/health HTTP ${res.status}` };
      return { ok: true, data: await res.json() };
    }
    case "compounder.status": {
      const res = await portalFetch(env, `/api/auto-compounder/positions`);
      if (!res.ok) return { ok: false, error: `positions HTTP ${res.status}` };
      const body = (await res.json()) as { positions?: { amount: string }[] };
      const positions = body.positions ?? [];
      return { ok: true, data: { status: "ok", positions: positions.length, total_deposited_usdc: positions.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0).toFixed(2) } };
    }
    case "health":
      return { ok: true, data: { status: "ok", service: "p31-capital-machine-mcp", version: "0.1.0" } };
    default:
      return { ok: false, error: `unknown tool: ${name}` };
  }
}

// ---------------------------------------------------------------------------
// OAuth 2.1 resource-server validation (RFC 8707 audience binding).
// Validates externally-issued bearer tokens against a fetched JWKS using
// WebCrypto (RS256 / ES256 / Ed25519). Zero new dependencies.
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

const app = new Hono<AppContext>();

app.get("/health", (c) => c.json({ status: "ok", service: "p31-capital-machine-mcp", timestamp: Date.now() }));

app.get("/.well-known/mcp", (c) =>
  c.json({
    name: "p31-capital-machine",
    description: "x402-gated MCP server exposing P31 Capital Machine surfaces (revenue, positions, opportunities, billing).",
    url: "https://p31-capital-machine-mcp.trimtab-signal.workers.dev/mcp",
    version: "0.1.0-beta",
    tools: TOOLS.map((t) => t.name),
    pricing: { wellKnown: "/.well-known/mcp-pricing" },
    transport: "streamable-http",
    oauth: {
      resource: c.env.RESOURCE_ID,
      authorizationServer: c.env.OAUTH_JWKS_URL ? "/.well-known/oauth-authorization-server" : null,
      rfc8707: true,
    },
  }),
);

// RFC 8414 — authorization-server metadata (the external IdP backing this resource server).
app.get("/.well-known/oauth-authorization-server", (c) => {
  const issuer = issuerFromJwks(c.env.OAUTH_JWKS_URL ?? "");
  return c.json({
    issuer,
    authorization_endpoint: issuer ? `${issuer}/authorize` : null,
    token_endpoint: issuer ? `${issuer}/token` : null,
    jwks_uri: c.env.OAUTH_JWKS_URL ?? null,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    resource: c.env.RESOURCE_ID,
  });
});

// RFC 9728 — protected-resource metadata for this resource server.
const protectedResourceMetadata = (env: Env) => {
  const issuer = issuerFromJwks(env.OAUTH_JWKS_URL ?? "");
  return {
    resource: env.RESOURCE_ID,
    authorization_servers: issuer ? [issuer] : null,
    scopes_supported: ["capital:read", "capital:write"],
  };
};
app.get("/.well-known/resource-server", (c) => c.json(protectedResourceMetadata(c.env)));
app.get("/.well-known/oauth-protected-resource", (c) => c.json(protectedResourceMetadata(c.env)));

app.get("/.well-known/llms.txt", (c) =>
  c.text(
    [
      "# P31 Capital Machine — x402-gated MCP server",
      "> Sovereign, hash-chained capital management for AI agents. Pay per call in USDC over x402.",
      "",
      "## Endpoints",
      "- POST /mcp — MCP JSON-RPC (stateless 2026-07-28: server/discover | tools/list | tools/call)",
      "- GET /.well-known/mcp — server metadata",
      "- GET /.well-known/mcp-pricing — per-tool USDC pricing",
      "- GET /.well-known/oauth-authorization-server — RFC 8414 AS metadata (OAuth 2.1 resource server)",
      "- GET /.well-known/resource-server — RFC 9728 protected-resource metadata",
      "- GET/POST /resources/:tool — REST mirror of paid tools (HTTP 402 challenge when unpaid)",
      "",
      "## Tools",
      "- revenue.getSummary ($0.02) — x402 revenue totals",
      "- positions.list ($0.01) — auto-compounder positions",
      "- opportunities.scan ($0.01) — MEV arbitrage opportunities",
      "- allocator.rebalance ($0.10, operator) — trigger rebalance",
      "- compounder.trigger ($0.05, operator) — compound positions",
      "- opportunities.execute ($0.25, operator) — execute an opportunity",
      "- entitlement.check (free), billing.listTiers (free), allocator.status (free), compounder.status (free), health (free)",
      "",
      "## Settlement",
      "Paid tools require the X-PAYMENT header (x402). Operator tools additionally require X-Operator-Token.",
      "Settlement lands in a SHA-256 hash-chained revenue ledger. Discovery: Coinbase x402 Bazaar.",
      "",
      "## Authentication",
      "This server also acts as an OAuth 2.1 resource server (RFC 8707). Tools accept an externally-issued",
      "`Authorization: Bearer <JWT>` (RS256/ES256/Ed25519) whose `aud` claim equals the configured resource;",
      "valid bearer tokens authorize calls, and invalid ones are rejected with HTTP 401. x402 payment and the",
      "X-Operator-Token gate are unchanged.",
      "",
    ].join("\n"),
  ),
);

app.get("/.well-known/mcp-pricing", (c) =>
  c.json({
    currency: "USDC",
    network: c.env.NETWORK,
    pay_to: c.env.PAY_TO,
    tools: Object.fromEntries(Object.entries(PRICING).map(([name, t]) => [name, { price_usdc: t.price, description: t.description }])),
  }),
);

/** REST mirror of paid MCP tools — discoverable x402 resources for the Bazaar.
 *  GET /resources/:tool → 402 challenge (discovery); POST /resources/:tool → execute after settlement. */
app.use("/resources/:tool", async (c, next) => {
  if (c.req.method !== "POST" && c.req.method !== "GET") return next();
  const tool = c.req.param("tool");
  const priced = PRICING[tool];
  if (!priced) return next(); // free tools: not paywalled as resources
  const mw = paymentMiddleware(
    c.env.PAY_TO as `0x${string}`,
    {
      [`/resources/${tool}`]: {
        price: `$${priced.price}`,
        network: c.env.NETWORK as any,
        config: {
          description: priced.description,
          discoverable: true,
          inputSchema: { bodyType: "json" },
          outputSchema: { type: "object" },
        },
      },
    },
    facilitator(c.env, "v1"),
  );
  const _r = await mw(c, next);
  if (!_r) return;
  return enrich402(_r, priced.description, {});
});

app.get("/resources/:tool", (c) => c.json({ tool: c.req.param("tool"), method: "GET", note: "paid resource — use POST to execute" }));

app.post("/resources/:tool", async (c) => {
  const tool = c.req.param("tool");
  const args = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const did = c.req.header("X-DID") || c.req.header("X-User-DID");
  const priced = PRICING[tool];

  if (OPERATOR_TOOLS.has(tool)) {
    const supplied = c.req.header("X-Operator-Token");
    if (!c.env.OPERATOR_TOKEN || supplied !== c.env.OPERATOR_TOKEN) {
      return c.json({ error: "operator token required (X-Operator-Token)" }, 403);
    }
    const spendError = enforceSpendLimit(tool, args);
    if (spendError) return c.json({ error: spendError }, 403);
  }

  const result = await executeTool(tool, args, c.env);
  if (priced) {
    recordX402Revenue(c.env, tool, did ?? "", priced.price ?? "0.01", c.executionCtx as unknown as ExecutionContext, { routing_fee: priced.price ?? "0.01", operation: tool });
  }
  return c.json({ tool, ...(result.ok ? { data: result.data } : { error: result.error }) }, result.ok ? 200 : 500);
});

// x402 v1 body-based payment gate: unpaid paid-tool calls get a 402 challenge.
app.use("/mcp", async (c, next) => {
  if (c.req.method !== "POST") return next();
  const toolName = ((await c.req.raw.clone().json().catch(() => ({}))) as { params?: { name?: string } })?.params?.name ?? "";
  const priced = PRICING[toolName];
  if (!priced) return next(); // free tools: always 200, no 402
  const mw = paymentMiddleware(
    c.env.PAY_TO as `0x${string}`,
    {
      "/mcp": {
        price: `$${priced.price}`,
        network: c.env.NETWORK as any,
        config: {
          description: priced.description,
          discoverable: true, // Bazaar discovery extension — CDP catalogs the paid route automatically
        },
      },
    },
    facilitator(c.env, "v1"),
  );
  const _r = await mw(c, next);
  if (!_r) return;
  return enrich402(_r, priced.description, {});
});

app.post("/mcp", async (c) => {
  const bodyText = await c.req.text().catch(() => "");
  let body: any = null;
  try { body = bodyText ? JSON.parse(bodyText) : null; } catch { body = null; }
  const id = body?.id ?? null;

  if (body && body.method === "tools/call") {
    const name = body?.params?.name ?? "";
    const args = body?.params?.arguments ?? {};

    // OAuth 2.1 resource-server gate: if a Bearer token was supplied it must
    // validate (RFC 8707 audience binding). Invalid → 401 MCP error result.
    const auth = c.req.header("Authorization") ?? "";
    if (auth.startsWith("Bearer ")) {
      const bearer = await verifyOAuthBearer(c.req.raw, c.env);
      if (bearer === null) {
        return c.json(
          mcpResult(id, {
            content: [{ type: "text", text: JSON.stringify({ error: "invalid or unauthorized bearer token (RFC 8707 aud binding)" }) }],
            isError: true,
          }),
          401,
        );
      }
    }

    if (OPERATOR_TOOLS.has(name)) {
      const supplied = c.req.header("X-Operator-Token");
      const expected = c.env.OPERATOR_TOKEN;
      if (!expected || supplied !== expected) {
        return c.json(
          mcpResult(id, {
            content: [{ type: "text", text: JSON.stringify({ error: "operator token required (X-Operator-Token)" }) }],
            isError: true,
          }),
          403,
        );
      }
      const spendError = enforceSpendLimit(name, args);
      if (spendError) {
        return c.json(
          mcpResult(id, {
            content: [{ type: "text", text: JSON.stringify({ error: spendError }) }],
            isError: true,
          }),
          403,
        );
      }
    }
  }

  // Delegate to the SDK v2 stateless handler. The body was read above, so
  // hand it over as parsedBody (the SDK never re-reads the consumed stream).
  execCtxByRequest.set(c.req.raw, c.executionCtx as unknown as ExecutionContext);
  const handler = createMcpHandler(() => buildServer(c.env));
  return withCors(await handler.fetch(c.req.raw, { parsedBody: body ?? undefined }));
});

export default app;