/**
 * mcp-x402-gateway — Thin x402 Worker (L3.2: Map x402 payment
 * middleware to local Base testnet fallback).
 *
 * Reuses the EXACT facilitator + paymentMiddleware pattern from
 * `software/workers/taler-bridge-billing/src/index.ts` (lines 15-20, 54-60,
 * 165-181) — the proven x402 primitives already shipping in production.
 *
 * Phase 1 (this file): standalone x402 Worker. Gates premium /
 * premium-high MCP tools with a 402 challenge. Free + metered-low tools
 * stay open. Settlement lands in the SAME RevenueTracker DO via
 * `POST /api/revenue/ingest` (taler-bridge-billing), so the
 * RevenueBadge dashboard shows combined x402 MCP revenue.
 *
 * The Node stdio bridge (spawns the 4 MCP servers) is L3.4.
 */

import { Hono } from "hono";
import { paymentMiddleware } from "x402-hono";
import { createFacilitatorConfig } from "@coinbase/x402";
import { verifyLoveHmac, resolveSecret } from "./love-auth";
import { issueLoveSettlement } from "./cbs-settlement";
import { meterGlm } from "./llm-meter";
import { runAgent } from "./orchestrator";

interface Env {
  PAY_TO: string;
  NETWORK: string;
  FACILITATOR_URL: string;
  FACILITATOR_KEY_ID: string;
  FACILITATOR_SECRET_KEY: string;
  REVENUE_INGEST_URL: string;
  REVENUE_API_TOKEN?: string;
  // L5 — Dual Settlement Router shares the LOVE ledger D1 + the L3.4 bridge URL.
  LOVE_LEDGER: D1Database;
  BRIDGE_URL: string;
  // Axis-6: shared HMAC secret proving a `love` request came from
  // the trusted first-party renderer (set via `wrangler secret put`).
  LOVE_AUTH_SECRET?: string;
  // Phase 4 — GLM metering: where to call love-ledger /llm/* and which model.
  LOVE_LEDGER_URL?: string;
  GLM_MODEL?: string;
  // Revenue-ledger integration (Phase 1 completion).
  REVENUE_LEDGER_URL?: string;
  // Entitlement Service — preflight credit gate (Phase 2).
  // Service binding is the primary path (worker→worker fetch to a public
  // *.workers.dev subrequest fails with error 1042); ENTITLEMENT_URL is the
  // fallback for non-sibling / external deployments.
  ENTITLEMENT?: Fetcher;
  ENTITLEMENT_URL?: string;
  ENTITLEMENT_API_TOKEN?: string;
  // Workers AI binding (GLM-4.7-Flash + others).
  AI?: any;
  // Phase 3 — Needle-as-a-Service binding (intent-resolver POST /classify).
  NEEDLE?: Fetcher;
  // CWP-2026-015 (A) — agent-runtime built-in tool executor.
  AGENT_RUNTIME?: Fetcher;
  /** OAuth 2.1 resource-server (RFC 8707). Optional — when unset, bearer validation is disabled and the server stays open (runbook §6). */
  OAUTH_JWKS_URL?: string;
  /** RFC 9207 expected token issuer (optional; falls back to the JWKS URL origin). */
  OAUTH_ISSUER?: string;
  /** RFC 8707 resource URI that a bearer token's `aud` claim MUST match. */
  RESOURCE_ID?: string;
}

type AppContext = { Bindings: Env };

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

const OAUTH_AS_ISSUER = "https://oauth-relay.trimtab-signal.workers.dev";
const OAUTH_AS_JWKS_URL = "https://oauth-relay.trimtab-signal.workers.dev/.well-known/jwks.json";
const RESOURCE_URI = "https://mcp-x402-gateway.trimtab-signal.workers.dev/mcp";
const JWKS_CACHE_TTL_MS = 15 * 60 * 1000;

let jwksCache: { source: string; fetchedAt: number; keys: Record<string, JsonWebKey> } | null = null;

/** Base64url → base64, then decode to a string. */
function b64urlDecode(s: string): string {
  const base64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
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
async function verifySignature(jwk: JsonWebKey, alg: string, signedData: Uint8Array, signature: Uint8Array): Promise<boolean> {
  const algSpec = webAlg(jwk, alg);
  try {
    const key = await crypto.subtle.importKey("jwk", jwk, algSpec as any, false, ["verify"]);
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
    const signedData = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = b64urlToBytes(parts[2]);
    if (!(await verifySignature(jwk, alg, signedData, signature))) return null;

    const payload = decoded.payload;
    const exp = payload.exp;
    if (typeof exp !== "number" || exp <= Math.floor(Date.now() / 1000)) return null;

    // RFC 8707: the token's audience MUST be bound to our resource.
    const aud = payload.aud;
    const audOk = Array.isArray(aud) ? aud.includes(env.RESOURCE_ID) : aud === env.RESOURCE_ID;
    if (!audOk) return null;

    // RFC 9207: the token's issuer MUST match the fleet AS (explicit
    // OAUTH_ISSUER wins; otherwise derive from the JWKS URL origin).
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

/** RFC 8414 authorization-server metadata — points at the fleet AS (oauth-relay). */
function oauthAsMetadata(resource: string): Record<string, unknown> {
  return {
    issuer: OAUTH_AS_ISSUER,
    authorization_endpoint: `${OAUTH_AS_ISSUER}/authorize`,
    token_endpoint: `${OAUTH_AS_ISSUER}/token`,
    jwks_uri: OAUTH_AS_JWKS_URL,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
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

/** Envelope-shaped 401 body for a rejected bearer token (capital-machine mcpResult shape). */
function oauthGateError(id: unknown): Record<string, unknown> {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28" },
    result: {
      resultType: "complete",
      content: [{ type: "text", text: JSON.stringify({ error: "invalid or unauthorized bearer token (RFC 8707 aud binding)" }) }],
      isError: true,
    },
  };
}

const app = new Hono<AppContext>();

/**
 * Build the facilitator config. On mainnet this must carry CDP API-key auth
 * (the public x402.org facilitator is testnet-only). We only attach auth
 * headers when both key id + secret are present, so the testnet facilitator
 * (no auth) keeps working unchanged. — mirrors `facilitator()` in
 * taler-bridge-billing/src/index.ts:54-60.
 */
function facilitator(c: Env, version: 'v1' | 'v2') {
  const url = c.FACILITATOR_URL as `${string}://${string}`;
  if (c.FACILITATOR_KEY_ID && c.FACILITATOR_SECRET_KEY) {
    const cfg = createFacilitatorConfig(c.FACILITATOR_KEY_ID, c.FACILITATOR_SECRET_KEY);
    if (version === 'v2') {
      return { url, createAuthHeaders: cfg.createAuthHeaders, version: 'v2' as const };
    }
    return { url, createAuthHeaders: cfg.createAuthHeaders };
  }
  if (version === 'v2') {
    return { url, version: 'v2' as const };
  }
  return { url };
}

/**
 * v1-only facilitator config for `paymentMiddleware`. Keeping this a
 * separate v1-typed entry point avoids feeding the v2 union branch into
 * x402-hono's `FacilitatorConfig` parameter — a pre-existing type error
 * that blocked `tsc --noEmit`. The `createAuthHeaders` cast papers over a
 * version skew between the installed @x402/core@2 (optional
 * verify/settle/supported) and x402@1.2's expected CreateHeaders
 * (required); at runtime both shapes are plain header records.
 */
function facilitatorV1(c: Env): {
  url: `${string}://${string}`;
  createAuthHeaders?: () => Promise<{
    verify: Record<string, string>;
    settle: Record<string, string>;
    supported: Record<string, string>;
    list?: Record<string, string>;
  }>;
} {
  const url = c.FACILITATOR_URL as `${string}://${string}`;
  if (c.FACILITATOR_KEY_ID && c.FACILITATOR_SECRET_KEY) {
    const cfg = createFacilitatorConfig(c.FACILITATOR_KEY_ID, c.FACILITATOR_SECRET_KEY);
    return { url, createAuthHeaders: cfg.createAuthHeaders as any };
  }
  return { url };
}

// Pricing tiers from spec §3.3 (seeded defaults; hot-reloadable via PRICING_JSON).

/**
 * Verify an x402 v2 payment token via the facilitator.
 * Calls POST /verify-v2 on the facilitator with the raw token + expected amount.
 * Uses CDP auth headers when FACILITATOR_KEY_ID + FACILITATOR_SECRET_KEY are set.
 */
async function verifyV2Payment(env: Env, token: string, expectedPrice: string): Promise<boolean> {
  const facilitatorUrl = env.FACILITATOR_URL;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (env.FACILITATOR_KEY_ID && env.FACILITATOR_SECRET_KEY) {
      const cfg = createFacilitatorConfig(env.FACILITATOR_KEY_ID, env.FACILITATOR_SECRET_KEY);
    const authHeaders = cfg.createAuthHeaders?.();
    if (authHeaders) {
      Object.assign(headers, authHeaders);
    }
    }

    const res = await fetch(`${facilitatorUrl}/verify-v2`, {
      method: "POST",
      headers,
      body: JSON.stringify({ token, expected_amount: expectedPrice }),
    });
    const data = await res.json() as Record<string, any>;
    return data.verified === true;
  } catch {
    return false;
  }
}
const PRICING: Record<string, { price: string; network: string; description: string }> = {
  // premium ($0.05)
  "oasis_execute": { price: "0.05", network: "base-sepolia", description: "Host command execution (sandboxed)" },
  "phos-adopt": { price: "0.05", network: "base-sepolia", description: "File adoption (spoon-gated)" },
  "phos-learn": { price: "0.05", network: "base-sepolia", description: "Filesystem scan + learn" },
  "phos-rollback": { price: "0.05", network: "base-sepolia", description: "Revert adopted moves" },
  "phos-watch": { price: "0.05", network: "base-sepolia", description: "Background file watcher" },
  "bus-emit": { price: "0.05", network: "base-sepolia", description: "Emit event-bus message" },
  "phos-deploy": { price: "0.05", network: "base-sepolia", description: "Cloudflare deploy (spoon-gated)" },
  "healer-remediate": { price: "0.05", network: "base-sepolia", description: "Autonomous remediation" },
  // premium-high ($0.25)
  "jitterbug-run": { price: "0.25", network: "base-sepolia", description: "Ambient exocortex LLM orchestration (spoon-gated)" },
  "brain-dump": { price: "0.25", network: "base-sepolia", description: "LLM elaboration (premium-high)" },
  // SOULSAFE + Ground-Truth (2026-07-28, L3.5) — metered-low ($0.01)
  "soulsafe_gate1_self_review": { price: "0.01", network: "base-sepolia", description: "SOULSAFE Gate 1 self-review checklist" },
  "soulsafe_gate2_cross_review": { price: "0.01", network: "base-sepolia", description: "SOULSAFE Gate 2 cross-review (information barrier)" },
  "truth_verify_baseline": { price: "0.01", network: "base-sepolia", description: "Verify-suite baseline payload" },
  "truth_register_fact": { price: "0.01", network: "base-sepolia", description: "Write a verified fact to ground-truth registry" },
  // premium ($0.05)
  "soulsafe_gate3_full": { price: "0.05", network: "base-sepolia", description: "SOULSAFE Gate 3 architect verification (full suite)" },
  "soulsafe_run_protocol": { price: "0.05", network: "base-sepolia", description: "SOULSAFE full 3-gate protocol run" },
  // SPACESHIP (2026-08-07) — metered-low ($0.01)
  "neo_pixel_control": { price: "0.01", network: "base-sepolia", description: "Set NeoPixel LED mode/color/brightness (spaceship)" },
};

// L5 — Dual Settlement Router. Reads X-Creation-Unit; for `love`,
// verifies the caller's LOVE balance and short-circuits straight to the
// bridge (no x402 402). Registered BEFORE the /mcp payment gate so
// it runs first; for usdc/auto it just calls next() (existing flow).
app.use(async (c, next) => {
  const unit = c.req.header("X-Creation-Unit");
  if (unit !== "love") return next();

  // Axis-6: require an HMAC-SHA256 proof (`X-Love-Auth-MAC` over
  // `love:<timestamp>`) from the trusted renderer when the shared
  // secret is configured. Prevents an external caller from spoofing
  // `X-Creation-Unit: love` to reach paid tools for free.
  if (c.env.LOVE_AUTH_SECRET) {
    const loveSecret = await resolveSecret(c.env.LOVE_AUTH_SECRET);
    const ok = await verifyLoveHmac(
      c.req.header("X-Love-Auth-MAC"),
      c.req.header("X-Love-Timestamp"),
      loveSecret,
    );
    if (!ok) {
      return c.json({ error: "Invalid LOVE settlement auth" }, 401);
    }
  }

  const did = c.req.header("X-DID") || c.req.header("X-User-DID");
  if (!did) return next();
  const body = (await c.req.raw.clone().json().catch(() => ({}))) as any;
  const price = PRICING[body?.params?.name ?? ""]?.price ?? "0";
  const bal = await c.env.LOVE_LEDGER.prepare(
    "SELECT balance FROM love_accounts WHERE did = ?"
  ).bind(did).first<{ balance: number }>();
  if (!bal || bal.balance < parseFloat(price)) {
    return c.json({ error: "Insufficient LOVE balance" }, 402);
  }
  // Real two-challenge Clause Blind Schnorr settlement issuance
  // (docs/specs/love-settlement-cbs.md §5). The gateway blinds a canonical
  // settlement message, the ledger signs both challenges, and the bridge
  // verifies + consumes. Fail closed: any issuance failure -> 502.
  // Free tools (price "0") carry no signature — nothing to settle.
  let sigB64: string | null = null;
  let settlementB64: string | null = null;
  if (parseFloat(price) > 0) {
    try {
      const issuance = await issueLoveSettlement(c.env.LOVE_LEDGER_URL ?? "", {
        did,
        tool: body?.params?.name ?? "",
        amount: price,
      });
      sigB64 = issuance.signatureB64;
      settlementB64 = issuance.settlementB64;
      c.header("X-LOVE-Signature", sigB64);
      c.header("X-LOVE-Settlement", settlementB64);
    } catch {
      return c.json({ error: "LOVE settlement issuance unavailable", x402_version: "2.0" }, 502);
    }
  }
  // LOVE-settled: bypass x402 gate, forward straight to the bridge.
  try {
    // SEP-2243: forward client tool-parameter headers (x-mcp-header) through
    // to the bridge so they survive the hop to the L3.4 MCP servers.
    const fwdHeaders: Record<string, string> = { "Content-Type": "application/json" };
    const xMcpHeader = c.req.header("x-mcp-header");
    if (xMcpHeader) fwdHeaders["x-mcp-header"] = xMcpHeader;
    const upstream = await fetch(c.env.BRIDGE_URL, {
      method: "POST",
      headers: {
        ...fwdHeaders,
        ...(sigB64 ? { "X-LOVE-Signature": sigB64 } : {}),
        ...(settlementB64 ? { "X-LOVE-Settlement": settlementB64 } : {}),
        "X-DID": did,
      },
      body: JSON.stringify(body),
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return c.json({ error: "Bridge service unavailable", x402_version: "2.0" }, 502);
  }
});

// Entitlement preflight gate — checks DID balance before x402 payment middleware.
// Runs AFTER LOVE dual-settlement router (line 127) but BEFORE x402 v2/v1 middlewares.
// Returns 402 if user has insufficient entitlement balance.
app.use("/mcp", async (c, next) => {
  if (c.req.method !== "POST") return next();

  const toolName = ((await c.req.raw.clone().json().catch(() => ({}))) as any)?.params?.name ?? "";
  const priced = PRICING[toolName];
  if (!priced) return next(); // free tools bypass entitlement check

  const did = c.req.header("X-DID") || c.req.header("X-User-DID");
  if (!did) return next(); // no DID = anonymous, let x402 handle payment

  const entitlementUrl = c.env.ENTITLEMENT_URL;
  if (!c.env.ENTITLEMENT && !entitlementUrl) return next(); // entitlement not configured, fall through to x402

  try {
    // Service binding (https://entitlement.internal) is the primary path —
    // public worker→worker subrequests on *.trimtab-signal.workers.dev fail
    // with 404 / error 1042. ENTITLEMENT_URL is the external fallback.
    const checkUrl = c.env.ENTITLEMENT ? "https://entitlement.internal/entitlement/check" : `${entitlementUrl}/entitlement/check`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (c.env.ENTITLEMENT_API_TOKEN) {
      headers["Authorization"] = `Bearer ${c.env.ENTITLEMENT_API_TOKEN}`;
    }

    const init: RequestInit = {
      method: "POST",
      headers,
      body: JSON.stringify({
        did,
        tool_id: toolName,
        estimated_cost_usdc: priced.price,
      }),
    };

    const res = c.env.ENTITLEMENT ? await c.env.ENTITLEMENT.fetch(checkUrl, init) : await fetch(checkUrl, init);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      return c.json({
        error: data.error || data.message || "Entitlement check failed",
        x402_version: "2.0",
        tool: toolName,
        cost: priced.price,
      }, res.status === 402 ? 402 : 500);
    }

    const result = await res.json() as any;
    // entitlement's respond.ok() wraps the payload: {success:true, data:{ok:true,...}}.
    // Normalize so both wrapped and bare {ok} shapes pass the gate.
    const payload = result?.data ?? result;
    if (!payload?.ok) {
      return c.json({
        error: payload?.message || "Insufficient entitlement balance",
        x402_version: "2.0",
        tool: toolName,
        cost: priced.price,
        balance: payload?.balance,
      }, 402, {
        "X-Entitlement-Balance": payload?.balance || "0",
        "X-Entitlement-Required": priced.price,
      });
    }
  } catch {
    // Entitlement service unreachable — fail open to x402 payment flow
    return next();
  }

  return next();
});

// x402 v2 header-based payment middleware (stateless, self-hosted paywalls).
// Reads payment proof from X-Payment-Token header instead of request body.
// Runs BEFORE the v1 body-based middleware to maintain dual-mode support.
app.use("/mcp", async (c, next) => {
  if (c.req.method !== "POST") return next();

  const paymentToken = c.req.header("X-Payment-Token");
  if (!paymentToken) return next(); // no v2 token → let v1 middleware handle it

  const toolName = ((await c.req.raw.clone().json().catch(() => ({}))) as any)?.params?.name ?? "";
  const priced = PRICING[toolName];
  if (!priced) return next(); // free tools: always 200, no payment needed

  const verified = await verifyV2Payment(c.env, paymentToken, priced.price);
  if (!verified) {
    return c.json({
      error: "Payment required",
      x402_version: "2.0",
      payment_required: `$${priced.price}`,
      network: c.env.NETWORK,
      payTo: c.env.PAY_TO,
    }, 402, {
      'X-Payment-Required': `$${priced.price}`,
      'X-Payment-Network': c.env.NETWORK,
      'X-Payment-Accept': 'application/x402-v2',
      'Access-Control-Expose-Headers': 'X-Payment-Required, X-Payment-Network, X-Payment-Accept',
    });
  }

  // Payment verified, proceed to v1 middleware (no-op since payment is settled).
  return next();
});

// x402 v1 body-based payment middleware (legacy, maintained for backward compat).
// The Node bridge (L3.4) reads the stdio
// backends; this Worker issues the 402 + verifies payment, then forwards
// to the bridge over a service binding. Phase 1: issue + verify only.
app.use("/mcp", async (c, next) => {
  if (c.req.method !== "POST") return next();
  // Peek the body without consuming it (clone) so the downstream /mcp
  // route can still read the original request stream.
  const toolName = ((await c.req.raw.clone().json().catch(() => ({}))) as any)?.params?.name ?? "";
  const priced = PRICING[toolName];
  if (!priced) return next(); // free tools: always 200, no 402

  const mw = paymentMiddleware(
    c.env.PAY_TO as `0x${string}`,
    {
      "/mcp": {
        price: `$${priced.price}`,
        network: c.env.NETWORK as any,
        config: { description: priced.description },
      },
    },
    facilitatorV1(c.env)
  );
  return mw(c, next);
});

// mcp-x402-gateway → revenue-ledger (fire-and-forget, non-blocking).
async function recordX402Revenue(c: AppContext["Bindings"], toolName: string, did: string, price: string, network: string, execCtx: ExecutionContext) {
  const url = c.REVENUE_LEDGER_URL;
  if (!url) return;
  const body = JSON.stringify({
    source: "x402",
    payer_did: did,
    merchant_did: c.PAY_TO,
    amount_usdc: price,
    asset: "USDC",
    metadata: { tool: toolName, network },
  });
  execCtx.waitUntil(
    fetch(`${url}/revenue/record`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }).catch(() => {})
  );
}

// mcp-x402-gateway → entitlement service (consume balance after payment).
async function consumeEntitlement(c: AppContext["Bindings"], did: string, toolName: string, price: string, execCtx: ExecutionContext) {
  if ((!c.ENTITLEMENT && !c.ENTITLEMENT_URL) || !did) return;
  const url = c.ENTITLEMENT ? "https://entitlement.internal/entitlement/consume" : `${c.ENTITLEMENT_URL}/entitlement/consume`;
  const txHash = `x402-${toolName}-${crypto.randomUUID()}`;
  const init = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      did,
      tool_id: toolName,
      amount_usdc: price,
      tx_hash: txHash,
    }),
  };
  execCtx.waitUntil(
    (c.ENTITLEMENT ? c.ENTITLEMENT.fetch(url, init) : fetch(url, init)).catch(() => {})
  );
}

// L5 — Bridge forward. The prior code only issued/verified the 402
// and then 404'd (no downstream /mcp handler). This closes the loop:
// paid AND free calls now proxy to the L3.4 Node stdio<->HTTP bridge.
app.post("/mcp", async (c) => {
  const bodyText = await c.req.text();
  let body: any = {};
  try { body = JSON.parse(bodyText); } catch {}
  const toolName = body?.params?.name ?? "";
  const priced = PRICING[toolName];
  const did = c.req.header("X-DID") || c.req.header("X-User-DID");

  // 2026-07-28 stateless contract (SEP-2243): every /mcp POST must name its
  // method via the Mcp-Method header — EXCEPT the legacy `initialize` /
  // `notifications/initialized` handshake, which the SDK-v2 ladder keeps
  // serving headerless for 2025-era clients (and the fleet health gate).
  // A headerless modern request that silently succeeds is a conformance gap
  // — fail cleanly with the same JSON-RPC -32020 the SDK-v2 servers return.
  // This guard sits at the bridge-forward route only; the payment/settlement
  // middlewares above it are untouched.
  const isLegacyHandshake = body?.method === 'initialize' || body?.method === 'notifications/initialized';
  if (!isLegacyHandshake && !c.req.header("Mcp-Method")) {
    return c.json({
      jsonrpc: "2.0",
      id: body?.id ?? null,
      error: {
        code: -32020,
        message: "Bad Request: the required Mcp-Method header is absent",
        data: { header: "(missing)" },
      },
    }, 400);
  }

  // OAuth 2.1 resource-server gate (RFC 8707): a supplied Bearer token on a
  // tools/call MUST validate (alg/kid/sig/exp, aud == RESOURCE_ID,
  // iss == fleet AS) — invalid ⇒ 401 MCP error, never silently ignored.
  const auth = c.req.header("Authorization") ?? "";
  if (auth.startsWith("Bearer ") && body?.method === "tools/call") {
    const bearer = await verifyOAuthBearer(c.req.raw, c.env);
    if (bearer === null) {
      return c.json(oauthGateError(body?.id ?? null), 401);
    }
  }

  // SEP-2243: forward client tool-parameter headers (x-mcp-header) to the
  // upstream bridge so they survive the hop to the L3.4 MCP servers.
  const fwdHeaders: Record<string, string> = { "Content-Type": "application/json" };
  const xMcpHeader = c.req.header("x-mcp-header");
  if (xMcpHeader) fwdHeaders["x-mcp-header"] = xMcpHeader;

  let upstreamText: string;
  let upstreamStatus: number;
  try {
    const upstream = await fetch(c.env.BRIDGE_URL, {
      method: "POST",
      headers: fwdHeaders,
      body: bodyText,
    });
    upstreamText = await upstream.text();
    upstreamStatus = upstream.status;
  } catch {
    return c.json({ error: "Bridge service unavailable", x402_version: "2.0" }, 502);
  }

  // The L3.4 bridge's `server/discover` returns protocolVersion + capabilities
  // + serverInfo but omits `supportedProtocolVersions`. Add the missing array
  // at the gateway (additive, 2026-07-28 stateless contract) so the fleet's
  // conformance badge sees the full discover shape. Bridge-forward only —
  // settlement/payment payloads pass through verbatim.
  if (body?.method === 'server/discover') {
    try {
      const upstreamJson = JSON.parse(upstreamText);
      if (upstreamJson?.result && typeof upstreamJson.result === 'object' &&
          !Array.isArray(upstreamJson.result.supportedProtocolVersions)) {
        upstreamJson.result.supportedProtocolVersions = ['2026-07-28'];
        upstreamText = JSON.stringify(upstreamJson);
      }
    } catch { /* non-JSON body — leave verbatim */ }
  }

  if (priced && did) {
    recordX402Revenue(c.env, toolName, did, priced.price, priced.network, c.executionCtx as any);
    consumeEntitlement(c.env, did, toolName, priced.price, c.executionCtx as any);
  }

  return new Response(upstreamText, {
    status: upstreamStatus,
    headers: { "Content-Type": "application/json" },
  });
});

// Land settled MCP revenue into the SAME RevenueTracker DO as
// taler-bridge-billing (exact /api/revenue/ingest shape).
app.post("/api/revenue/ingest", async (c) => {
  const token = c.env.REVENUE_API_TOKEN;
  if (token) {
    const auth = c.req.header("Authorization") || "";
    if (auth !== `Bearer ${token}`) return c.json({ error: "Unauthorized" }, 401);
  }
  let body: { wallet?: string; amount?: string; source?: string; txId?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  if (!body.wallet || body.amount === undefined || !body.source) {
    return c.json({ error: "Missing wallet, amount, or source" }, 400);
  }
  // Forward to taler-bridge-billing ingest (already built for this shape).
  const res = await fetch(c.env.REVENUE_INGEST_URL, {
    method: "POST",
    headers: token ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` } : { "Content-Type": "application/json" },
    body: JSON.stringify({
      wallet: body.wallet,
      amount: String(body.amount),
      source: `mcp-x402:${body.source}`,
      txId: body.txId,
    }),
  });
  return c.json(await res.json().catch(() => ({ ok: res.ok })), res.status as 200 | 401 | 500);
});

// Phase 4 (CWP-2026-013) — Reserve & Refund GLM metering endpoint.
// Reserves max LOVE upfront, streams GLM-4.7-Flash (Workers AI), and refunds
// the unspent difference on stream flush via ctx.waitUntil. Turns GLM into a
// self-funding revenue engine. Auth: X-DID + (optional) LOVE settlement HMAC.
app.post("/llm/complete", async (c) => {
  const did = c.req.header("X-DID") || c.req.header("X-User-DID");
  if (!did) return c.json({ error: "Missing X-DID header" }, 400);

  // Axis-6: require HMAC proof when LOVE_AUTH_SECRET is configured.
  if (c.env.LOVE_AUTH_SECRET) {
    const loveSecret = await resolveSecret(c.env.LOVE_AUTH_SECRET);
    const ok = await verifyLoveHmac(
      c.req.header("X-Love-Auth-MAC"),
      c.req.header("X-Love-Timestamp"),
      loveSecret,
    );
    if (!ok) return c.json({ error: "Invalid LOVE settlement auth" }, 401);
  }

  const body = (await c.req.json().catch(() => ({}))) as any;
  const maxTokens = Math.min(Math.max(parseInt(String(body.max_tokens ?? "4096"), 10) || 4096, 1), 32000);
  const model = body.model || c.env.GLM_MODEL || "glm-4.7-flash";
  const messages =
    body.messages ??
    (body.prompt ? [{ role: "user", content: String(body.prompt) }] : []);
  if (!Array.isArray(messages) || messages.length === 0) {
    return c.json({ error: "Missing messages or prompt" }, 400);
  }

  return meterGlm(c.env, c.executionCtx, { did, maxTokens, model, messages });
});

// Phase 3 — proxy natural-language -> P31 tool resolution to the Needle
// service (intent-resolver POST /classify). Axis-6 HMAC-gated (creation action).
// A cold needle isolate is guarded by an 8s abort so it can never hang the
// gateway; on any failure we fail closed to a clean fallback.
app.post("/classify", async (c) => {
  if (!c.env.NEEDLE) return c.json({ error: "NEEDLE service not bound" }, 503);
  if (c.env.LOVE_AUTH_SECRET) {
    const loveSecret = await resolveSecret(c.env.LOVE_AUTH_SECRET);
    const ok = await verifyLoveHmac(
      c.req.header("X-Love-Auth-MAC"),
      c.req.header("X-Love-Timestamp"),
      loveSecret,
    );
    if (!ok) return c.json({ error: "Invalid LOVE settlement auth" }, 401);
  }
  const body = (await c.req.json().catch(() => ({}))) as any;
  if (!body?.prompt || !Array.isArray(body?.tools) || body.tools.length === 0) {
    return c.json({ error: "Missing prompt or tools[]" }, 400);
  }
  // Guard the sub-request so a cold needle isolate can never hang the gateway
  // indefinitely. The needle cold-start is ~20-28s (22 MB R2 model load), so
  // the ceiling tracks that rather than a tight timeout.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const upstream = await c.env.NEEDLE.fetch("https://intent-resolver/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: body.prompt, tools: body.tools }),
      signal: ctrl.signal,
    });
    return c.json(await upstream.json(), upstream.status as 200 | 400 | 503);
  } catch {
    // Needle cold-start/timeout — fail closed to a clean fallback.
    return c.json({ needle_used: false, fallback_reason: "Needle service unavailable" }, 200);
  } finally {
    clearTimeout(timer);
  }
});

app.get("/health", (c) => c.json({ status: "ok", service: "mcp-x402-gateway", network: c.env.NETWORK, timestamp: Date.now() }));

// RFC 8414 — authorization-server metadata (points at the fleet AS).
app.get("/.well-known/oauth-authorization-server", (c) =>
  c.json(oauthAsMetadata(c.env.RESOURCE_ID ?? RESOURCE_URI)),
);

// RFC 9728 — protected-resource metadata (canonical path + alias).
app.get("/.well-known/oauth-protected-resource", (c) =>
  c.json(protectedResourceMetadata(c.env, RESOURCE_URI, ["gateway:read", "gateway:write"])),
);
app.get("/.well-known/resource-server", (c) =>
  c.json(protectedResourceMetadata(c.env, RESOURCE_URI, ["gateway:read", "gateway:write"])),
);

// CWP-2026-014 — Agent Orchestrator. Natural-language query → classify (needle
// → GLM fallback) → plan → execute via bridge → settle as a PQC care contract
// in LOVE. Axis-6 HMAC-gated (creation action). See orchestrator.ts.
app.post("/agent/run", async (c) => {
  const did = c.req.header("X-DID") || c.req.header("X-User-DID");
  if (!did) return c.json({ error: "Missing X-DID header" }, 400);
  if (c.env.LOVE_AUTH_SECRET) {
    const loveSecret = await resolveSecret(c.env.LOVE_AUTH_SECRET);
    const ok = await verifyLoveHmac(
      c.req.header("X-Love-Auth-MAC"),
      c.req.header("X-Love-Timestamp"),
      loveSecret,
    );
    if (!ok) return c.json({ error: "Invalid LOVE settlement auth" }, 401);
  }
  const body = (await c.req.json().catch(() => ({}))) as any;
  body.did = did;
  return runAgent(c.env, body);
});

// Advertise per-tool cost (spec §3.3) + x402 v2 dual-mode capability.
app.get("/.well-known/mcp-pricing", (c) => c.json({
  x402_version: "2.0",
  supports_v1: true,
  supports_v2: true,
  v2_header: "X-Payment-Token",
  v2_payment_header: "X-Payment-Required",
  currency: "USDC",
  network: c.env.NETWORK,
  tiers: {
    free: "$0 (always 200, no 402)",
    "metered-low": "$0.01",
    premium: "$0.05",
    "premium-high": "$0.25",
  },
  tools: PRICING,
}));

// MCP Server Card (Smithery discovery).
app.get("/.well-known/mcp/server-card.json", (c) => c.json({
  $schema: "https://schema.smithery.ai/server-card.json",
  name: "mcp-x402-gateway",
  description: "P31 x402 payment gateway for MCP — free, metered, and premium tools with a 402 challenge. Proxies the P31 tool suite.",
  version: "2.0.0",
  serverInfo: { name: "p31-mcp-x402-gateway", version: "2.0.0" },
  endpoint: "https://mcp-x402-gateway.trimtab-signal.workers.dev/mcp",
  transport: "streamable-http",
  authentication: { type: "none" },
  tools: Object.entries(PRICING).map(([name, spec]) => ({ name, description: spec.description })),
  resources: [],
  prompts: [],
  pricing: "/.well-known/mcp-pricing",
}));

// MCP Server Card (2026-07-28 spec). Advertises the gateway's capabilities
// so agents can discover it without an initialize handshake.
app.get("/.well-known/mcp", (c) => c.json({
  protocolVersion: "2026-07-28",
  serverInfo: { name: "p31-mcp-x402-gateway", version: "2.0.0" },
  capabilities: { tools: {} },
  x402: { version: "2.0", supports_v1: true, supports_v2: true },
  url: c.env.BRIDGE_URL || "https://mcp-x402-bridge.p31ca.org/mcp",
  pricing: { wellKnown: "/.well-known/mcp-pricing" },
}));

export default app;
