# fix: marketplace-mcp OAuth 2.1 roll-out — RFC 8414 / RFC 9728 / RFC 8707 / RFC 9207 iss

<!-- P31-HEADER
id: p31_fix_plan_marketplace_mcp_oauth21_20261012_v1.0
type: fix-plan
component: workers/marketplace-mcp
status: resolved
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

## Symptom

`workers/marketplace-mcp` (a public, mutation-capable MCP server —
listings, offers, escrow, disputes) had **no** OAuth 2.1 hardening: no
RFC 8414 AS metadata, no RFC 9728 protected-resource metadata, and no
RFC 8707 audience-bound bearer validation. Per
`docs/enterprise/api/oauth-21-rollout-runbook.md` §3, its wave notes are
"Steps 1–5; gate offer mutation tools".

## What was done (runbook §2 Steps 1–5)

1. **RFC 8414** — `GET /.well-known/oauth-authorization-server` added. The
   worker is a pure resource server: the metadata points at the fleet AS
   (`issuer` = oauth-relay origin, `jwks_uri` = oauth-relay
   `/.well-known/jwks.json`) and advertises `resource` = this server's
   resource URI.
2. **RFC 9728** — `GET /.well-known/resource-server` **and** the alias
   `GET /.well-known/oauth-protected-resource` added:
   `{ resource: "https://marketplace-mcp.trimtab-signal.workers.dev/mcp",
   authorization_servers: ["https://oauth-relay.trimtab-signal.workers.dev"],
   scopes_supported: ["marketplace:read", "marketplace:write"] }`.
3. **RFC 8707** — `verifyOAuthBearer` ported from the fleet reference
   (`workers/p31-capital-machine-mcp/src/index.ts`): alg/kid/JWKS/signature
   (WebCrypto RS256/ES256/Ed25519, 15-min JWKS cache) + `exp` + `aud` =
   `RESOURCE_ID`. **Opt-in via env flag:** the gate activates only when
   `OAUTH_JWKS_URL` + `RESOURCE_ID` are configured; without a configured AS,
   today's open access is preserved unchanged (verified: `tools/call` and
   discover work identically with no env vars). When configured: a supplied
   `Authorization: Bearer` token on ANY `tools/call` MUST validate —
   invalid ⇒ HTTP 401 MCP error result (never silently ignored), and the
   three offer mutation tools (`marketplace_offer`, `marketplace_accept`,
   `marketplace_reject`) **require** a valid bearer (missing ⇒ 401) per the
   runbook's no-fail-open do-not and the "gate offer mutation tools" wave
   note. Unauthenticated tools (search/get/history/escrow status) stay open
   (runbook §4 negative test 5).
4. **RFC 9207 `iss`** — the ported verifier requires
   `payload.iss === env.OAUTH_ISSUER` when set, else the issuer derived
   from the JWKS URL origin (the reference's own gap — see
   `mcp-servers-oauth21-iss-cimd.md` — was fixed in this copy, not
   propagated).
5. **CIMD over DCR** — no RFC 7591 `/oauth/register` endpoint added, ever;
   the RFC 9728 document advertises `authorization_servers` so clients do
   CIMD-based discovery against the AS instead of registering on the fly.

Env (wrangler.toml vars): `RESOURCE_ID =
"https://marketplace-mcp.trimtab-signal.workers.dev/mcp"`,
`OAUTH_JWKS_URL = "https://oauth-relay.trimtab-signal.workers.dev/.well-known/jwks.json"`
(both plain vars, matching capital-machine), optional `OAUTH_ISSUER`
documented. CORS allow-lists gained `Authorization`.

## Evidence

- `npx tsc --noEmit` exit 0; `wrangler deploy --dry-run` clean; deployed
  `d4f17d15-f7ba-4bcf-9550-af82cfd60e06` (2026-10-12).
- Live probes:
  - `GET /.well-known/oauth-authorization-server` → 200
    (`issuer`, `jwks_uri`, `resource` correct).
  - `GET /.well-known/resource-server` and
    `/.well-known/oauth-protected-resource` → 200 (`resource` +
    `authorization_servers` correct).
  - `tools/call marketplace_offer` without bearer → **401** MCP error
    result (`isError: true`).
  - `tools/call marketplace_offer` + `Authorization: Bearer <garbage>` →
    **401** ("invalid or unauthorized bearer token (RFC 8707 aud
    binding)").
  - `tools/call marketplace_search` + bad bearer → **401** (bearer present
    must validate on open tools too).
  - Local handler probe with no env vars: discover + offer mutation →
    200 (open access preserved — opt-in flag off).
- Runbook §4 negative-token tests 1-4 (wrong aud / wrong iss / expired /
  bad kid-alg) are covered by the ported verifier's check order; test 5
  (no Authorization header on open tools) verified live.