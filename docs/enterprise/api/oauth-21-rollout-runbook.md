# OAuth 2.1 Rollout Runbook — public MCP fleet

<!-- P31-HEADER
id: p31_oauth21_rollout_runbook_20261011_v1.0
type: runbook
component: docs/enterprise/api
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

This runbook specifies, per public MCP server, the exact steps to harden the
fleet to the 2026-07-28 OAuth 2.1 requirements: RFC 8414 authorization-server
metadata discovery, RFC 9728 protected-resource metadata, RFC 8707
audience-bound token validation (MUST), `iss` validation, and Client ID
Metadata Documents (CIMD) over the deprecated RFC 7591 DCR.

**Read first:** `docs/MCP_MIGRATION_2026-07-28.md` (line 42: DCR deprecated,
"Prefer Client ID Metadata Documents for client registration") and
`docs/MCP_LANDSCAPE_2026.md` §3 (Workers OAuth Provider implements OAuth 2.1 +
RFC 9207 issuer identification).

## 0. Why this is the highest-leverage security item

The May-2026 measurement preprint — *A First Measurement Study on
Authentication Security in Real-World Remote MCP Servers*
([arXiv:2605.22333v1](https://arxiv.org/abs/2605.22333), submitted
2026-05-21) — probed 119 dynamically testable OAuth-enabled remote MCP servers:

- **Dynamic client registration flaws: 96.6%** (115 of 119) — the
  highest-prevalence category in the paper's taxonomy.
- Open client environment flaws: 85.7% (102 of 119).
- Common OAuth misconfigurations: 28.6%; delegated authorization: 15.1%.
- **Every server tested had at least one flaw** (325 confirmed flaws total).

The flaw class the paper found most often is exactly the one the MCP
2026-07-28 revision deprecated: RFC 7591 DCR is now MAY-level
("deprecated and retained for backwards compatibility with authorization
servers that do not support Client ID Metadata Documents"), while CIMD is
SHOULD-level. Because DCR default deployments let *any* caller register a
client and redirect URI (the Obsidian "one-click account takeover" chain), a
fleet that accepts DCR-registered clients, accepts unregistered redirects, or
omits audience binding is exposed to the same 96.6%-prevalent flaw class.
Closing this gap — per server below — is therefore the single highest-leverage
OAuth security item for the P31 public surface.

## 1. Reference implementation (read first, do not edit in this wave)

`workers/p31-capital-machine-mcp/` is the fleet reference. Its sources are
owned by the parallel agent; **do not edit them** — copy the patterns:

| Capability | Evidence |
|---|---|
| Env config: `RESOURCE_ID` + `OAUTH_JWKS_URL` | `workers/p31-capital-machine-mcp/wrangler.toml` vars block (resource = `https://…/mcp`, JWKS points at the oauth-relay) |
| RFC 8707 validation block (comment) | `workers/p31-capital-machine-mcp/src/index.ts:332-335` |
| `verifyOAuthBearer` — alg/kid/JWKS/signature/exp/**aud** checks, never throws | `workers/p31-capital-machine-mcp/src/index.ts:404-449` |
| Issuer-derivation helper (origin from JWKS URL) | `workers/p31-capital-machine-mcp/src/index.ts:451-458` |
| RFC 8414 AS metadata route | `workers/p31-capital-machine-mcp/src/index.ts:481-495` |
| RFC 9728 protected-resource metadata + routes | `workers/p31-capital-machine-mcp/src/index.ts:497-507` |
| Well-known aliases advertised in `llms.txt` | `workers/p31-capital-machine-mcp/src/index.ts:519-520` |
| Bearer gate wired into `tools/call` (401 on invalid) | `workers/p31-capital-machine-mcp/src/index.ts:655-670` |

**Known gaps in the reference (file per-server fix-plans during the wave):**

1. ~~`verifyOAuthBearer` validates signature/exp/aud but **not `iss`**~~ —
   **CLOSED 2026-10-12** (`p31-fix-plan` →
   `mcp-servers-oauth21-iss-cimd.md`, resolved). `verifyOAuthBearer` now
   requires `iss` to equal `OAUTH_ISSUER` or the issuer derived from
   `OAUTH_JWKS_URL` (`src/index.ts:542-548`), deployed as version
   `6204975f-a75e-4bf7-9c10-539f08eaa071`.
2. No CIMD surface — acceptable for a pure resource server (it never registers
   clients), but its RFC 9728 metadata must keep advertising
   `authorization_servers` (it does, `:497-507`).
3. The AS side of the fleet (oauth-relay) added CIMD + RFC 8707 resource
   passthrough + RFC 9207 `iss` in the 2026-10-11 hardening wave — cite it as
   the AS-side reference: `workers/oauth-relay/src/index.ts:139-163`
   (`resolveClientMetadata`), `:185-187` (`validateResourceIndicator`),
   `:236` (`authorization_response_iss_parameter_supported`), `:253`
   (`/.well-known/oauth-protected-resource`), `:580` (`iss` on the
   authorization response), `:645` (`iss`/`resource` in token responses).

## 2. Per-server steps (apply identically to all 9 servers)

**Step 0 — inventory.** Locate the entry file (table below). Vanilla
`export default { fetch }` handlers (bros, dads, marketplace-mcp,
p31-justice-hub, p31-crypto-mcp, phenix-wallet-mcp) add explicit pathname
branches before the API router; Hono apps (mcp-registry, mcp-x402-gateway,
p31-capital-machine-mcp) add `app.get(...)` routes before the 404 fallback.

**Step 1 — RFC 8414 AS metadata discovery.** Add
`GET /.well-known/oauth-authorization-server`. If the server fronts its own
authorization endpoint, emit full metadata (`issuer`, `authorization_endpoint`,
`token_endpoint`, `jwks_uri`, `response_types_supported: ["code"]`,
`grant_types_supported: ["authorization_code"]`,
`token_endpoint_auth_methods_supported`, `code_challenge_methods_supported:
["S256"]`, `authorization_response_iss_parameter_supported: true`). Otherwise
(the normal case) act as a resource server and *point* at the fleet AS —
mirror capital-machine `src/index.ts:481-495`: `issuer` =
`https://oauth-relay.trimtab-signal.workers.dev`, `jwks_uri` =
`https://oauth-relay.trimtab-signal.workers.dev/.well-known/jwks.json`,
`resource` = the server's own resource URI.

**Step 2 — RFC 9728 `/.well-known/resource-server`.** Add
`GET /.well-known/resource-server` **and** the alias
`GET /.well-known/oauth-protected-resource` (capital-machine
`src/index.ts:497-507`). Body:

```json
{
  "resource": "https://<server>.trimtab-signal.workers.dev/mcp",
  "authorization_servers": ["https://oauth-relay.trimtab-signal.workers.dev"],
  "scopes_supported": ["<server>:read", "<server>:write"]
}
```

`resource` must equal the exact URI the tokens' `aud` claim will carry —
reuse the same value in the `RESOURCE_ID` var (single source of truth).

**Step 3 — RFC 8707 audience-bound token validation (MUST per 2026-07-28).**
Port the `verifyOAuthBearer` pattern (capital-machine `src/index.ts:332-449`,
invocation at `:655-670`) into the server's auth gate:

1. Add `RESOURCE_ID` and `OAUTH_JWKS_URL` to the server's `wrangler.toml`
   `[vars]` (JWKS URL → oauth-relay; keep it a secret only if the org policy
   says so — capital-machine ships it as a plain var).
2. Copy `b64urlDecode` / `decodeJwt` / `fetchJwksKeys` / `webAlg` /
   `verifySignature` / `verifyOAuthBearer` verbatim (WebCrypto only, zero new
   dependencies, 15-minute JWKS cache).
3. Gate every `tools/call` (and REST mirror) entry: when an
   `Authorization: Bearer` header is present it **MUST** validate — invalid or
   `aud ≠ RESOURCE_ID` ⇒ HTTP 401 MCP error result (capital-machine
   `src/index.ts:655-670`). This is a MUST-level requirement of the 2026-07-28
   alignment: a supplied bearer token that fails validation is rejected, never
   silently ignored.

**Step 4 — `iss` validation.** Extend the ported verifier: after the `aud`
check, require `payload.iss` (string) to equal the issuer derived from the AS
metadata (`issuerFromJwks`, capital-machine `src/index.ts:451-458`). This
closes the mix-up/issuer-substitution gap present in the reference itself —
fix it in the copy even though the reference still lacks it (filed in
`docs/fix-plans/mcp-servers-oauth21-iss-cimd.md`).

**Step 5 — CIMD over DCR.** **Do not add any RFC 7591
`/oauth/register` endpoint.** The fleet's AS (oauth-relay) already implements
the CIMD path (`workers/oauth-relay/src/index.ts:139-163`, gated by
`CIMD_ENABLED`, redirect-uri allowlist from the client's metadata document,
built-in clients same-origin restricted). Resource servers additionally:
never mint or accept DCR-registered clients; advertise
`authorization_servers` in their RFC 9728 document (Step 2) so clients do
CIMD-based discovery against the AS instead of registering on the fly.
None of the 9 public MCP servers has (or adds) a DCR endpoint — the CIMD
preference is therefore expressed purely through their RFC 9728
`authorization_servers` advertisement (per-server N/A, recorded in §3).

**Step 6 — SEP-2243 x-mcp-header hygiene.** Where a server forwards MCP
requests to an upstream (mcp-registry's `/servers/:id/call` proxy,
mcp-x402-gateway's bridge forwarding), client tool-parameter headers
(`x-mcp-header: <name>`, names lowercased per SEP-2243) must be preserved on
the forwarded request rather than dropped. Servers that do not forward MCP
requests are N/A.

## 3. Server matrix

| Server | Entry file | Auth today | OAuth well-knowns today | Wave notes |
|---|---|---|---|---|
| bros | `workers/bros/src/index.ts` (vanilla, `:580`) | none (open) | 8414 + 9728 landed (`:592-600`), server-card (`:601`) | **Done 2026-10-12** — Steps 1–5: 8414/9728 routes, RFC 8707+9207 bearer gate on tools/call (`:630`), no DCR endpoint (CIMD N/A), x-mcp-header N/A (no forwarding). Deployed `867c32f5-633c-47bb-8f63-cb3bc38a06a0`; probes green; garbage-bearer ⇒ 401. |
| dads | `workers/dads/src/index.ts` (vanilla, `:633`) | none | 8414 + 9728 landed (`:645-653`), server-card (`:654`) | **Done 2026-10-12** — Steps 1–5: as bros, gate at `:683`. Deployed `baa89107-7372-461c-8332-a505a4209e54`; probes green; garbage-bearer ⇒ 401. |
| marketplace-mcp | `workers/marketplace-mcp/src/index.ts` (SDK v2 `createMcpHandler`) | RFC 8414/9728/8707/iss landed 2026-10-11 (opt-in, offer mutations gated) | ✅ LANDED (2026-10-11) |
| p31-justice-hub | `workers/p31-justice-hub/src/index.ts` (vanilla, `:598`) | none | 8414 + 9728 landed (`:615-623`), server-card (`:624`) | **Done 2026-10-12** — Steps 1–5: gate at `:659`. Deployed `207a7800-8574-48c5-9c7a-020970ad9e9c`; probes green; garbage-bearer ⇒ 401. |
| p31-crypto-mcp | `workers/p31-crypto-mcp/src/index.ts` (vanilla, `:337`) | none | 8414 + 9728 landed (`:346-354`), server-card (`:377`) | **Done 2026-10-12** — Steps 1–5: gate at `:368`. Deployed `5080b1ec-c0f2-469a-8808-476d906a1f58`; probes green; garbage-bearer ⇒ 401. |
| phenix-wallet-mcp | `workers/phenix-wallet-mcp/src/index.ts` (vanilla, `:679`) | CORS-only (`:435`) | 8414 + 9728 landed (`:692-699`), server-card (`:701`) | **Done 2026-10-12** — Steps 1–5: `Env` interface + `[vars]` added, gate at `:730`. Deployed `47a7bb5d-9e2d-4271-9346-115ba7e24c55`; probes green; garbage-bearer ⇒ 401. |
| p31-capital-machine-mcp | `workers/p31-capital-machine-mcp/src/index.ts` (Hono) | RFC 8707 + x402 + operator token | 8414/9728/resource-server done (`:481-507`) | Reference; `iss` gap closed by the parallel agent (see §1). Not touched in this wave. |
| mcp-registry | `workers/mcp-registry/src/index.ts` (vanilla, `:2370` router) | none (RBAC via CF Access on admin paths) | 8414 + 9728 landed (`:2379-2387`), server-card/ard/ai-catalog (`:2163-2168`) | **Done 2026-10-12** — Steps 1–5: gate in `handleMcpSurface` (`:2133-2147`), fleet AS metadata published in the server card `oauth` block + ai-catalog resources, SEP-2243 x-mcp-header forwarding added to the call proxy (`:1798-1802`). Deployed `93cf31bf-7dc1-45aa-9340-38bdc04af5f1`; probes + 75/75 vitest green; garbage-bearer ⇒ 401. |
| mcp-x402-gateway | `workers/mcp-x402-gateway/src/index.ts` (Hono, `:61`) | x402 + LOVE auth (`src/love-auth.ts`) | 8414 + 9728 routes added (`:712-722`), mcp-pricing/server-card | **Source-only 2026-10-12** — Steps 1–5 landed in source: bearer gate in `app.post("/mcp")` (`:601-609`), SEP-2243 x-mcp-header forwarded to the bridge on both paths (`:610-616`, `:352-357`), `[vars]` documented. **NOT deployed** — blocked on the Secrets Store scope (`docs/fix-plans/p31-fix-plan-gateway-deploy-secrets-store-scope.md`); `tsc --noEmit` + `wrangler deploy --dry-run` green. |

## 4. Per-server verification (after the wave)

```bash
ORIGIN=https://<server>.trimtab-signal.workers.dev
curl -s $ORIGIN/.well-known/oauth-authorization-server | jq .issuer,.jwks_uri,.resource
curl -s $ORIGIN/.well-known/resource-server | jq .resource,.authorization_servers
curl -s $ORIGIN/.well-known/oauth-protected-resource | jq .resource
```

Negative token tests (all must yield 401 MCP error):

1. Valid signature, `aud` = other server's resource → **401** (RFC 8707).
2. Valid signature, `iss` = different AS → **401** (RFC 9207 mix-up defense).
3. Expired token → **401**.
4. No `kid` / unknown `kid` / unsupported `alg` → **401**.
5. No `Authorization` header on an open tool → unchanged behavior (bearer
   enforcement must not break the unpaid/x402 path).

## 5. Rollout order and ownership

1. **AS side (done 2026-10-11):** oauth-relay hardened — RFC 9728 route,
   RFC 8707 resource passthrough + `invalid_target`, RFC 9207 `iss` on the
   authorization response, CIMD behind `CIMD_ENABLED`, migration
   `workers/oauth-relay/migrations/004_rfc8707.sql`.
2. **Monetization portal (done 2026-10-11):** RFC 8707 audience-bound role
   tokens behind `OAUTH21_ENABLED` (`monetization/src/lib/oauth21.ts`), D1
   passkey store (`monetization/src/lib/passkeyStore.ts`).
3. **This wave (parallel agent):** apply Steps 1–5 to the 9 servers above;
   capital-machine-mcp gets the `iss` gap closed first since it is the
   reference. File any per-server fix-plan under `docs/fix-plans/` before
   continuing (ownership contract).
4. Flip `CIMD_ENABLED = "true"` on oauth-relay only after the fleet's RFC 9728
   documents advertise `authorization_servers` consistently.

## 6. Do-nots

- No RFC 7591 DCR endpoints, ever — the 96.6% flaw class.
- No bearer validation that fails open (missing/empty token on a gated tool
  ⇒ 401, not a pass).
- No `aud` wildcards; `RESOURCE_ID` must be the exact per-server resource URI.
- Do not edit the reference implementation in this wave — the parallel agent
  owns those sources; changes go through their rollout.