<!-- P31-HEADER
id: p31_fix_plan_monetization_wildcard_cors_default_20261014_v1.0
type: fix-plan
component: monetization
status: resolved
retention: keep-forever
created: 2026-10-14T00:00:00Z
owner: will
-->

# fix-plan: money-touching APIs default to wildcard CORS

## Symptom

Every response on the monetization portal and the capital-machine workers
ships `Access-Control-Allow-Origin: *`. For endpoints that issue role tokens
(`/api/auth/token`), record revenue, or set entitlements, any website can call
them from a browser. Auth is header-token based so this is not immediately
exploitable, but it cancels the intended origin discipline (OAuth 2.1
audience-binding in `monetization/src/lib/oauth21.ts` and CF Access
`ZERO_TRUST_TEAM_DOMAIN` fallback) and turns any token leak into a remote
exploit from any origin.

`workers/config-gateway/wrangler.toml` additionally sets
`ALLOWED_ORIGINS = "*"`, and the gateway answers
`/api/config`, `/api/usage`, etc. to everyone.

## Evidence

- `monetization/src/worker.ts` — `jsonResponse` sets `Access-Control-Allow-Origin: *` on every API reply (auth, proxy, errors).
- `workers/revenue-ledger/index.ts` — `corsHeaders` = `*` on all ledger routes.
- `workers/config-gateway/wrangler.toml` — `ALLOWED_ORIGINS = "*"`.

## Root cause

CORS was opened during early portal development for the mobile/web app and
never narrowed.

## Fix

1. Add an `ALLOWED_ORIGINS` env/var to each worker and emit the request
   origin only when it is in the allowlist (portal origin, app
   `https://monetization.p31ca.org`, dashboard domain, mobile `capacitor://`
   / `https://localhost` dev).
2. Reflect no CORS header for disallowed origins (or emit a strict list).
3. For `config-gateway`, restrict `ALLOWED_ORIGINS` to the actual consumers
   instead of `*`.

## Verification

- Curl with `Origin: https://evil.example` on `/api/auth/token` gets no
  `Access-Control-Allow-Origin` header.
- Portal from the real origin still passes its API smoke tests
  (`pnpm test`, live surfaces).

## Impact

Reduces the blast radius of any bearer-token/role-token exposure from
"any origin" to "known origins".

## Not blocking

Read-only GETs and `/api/health/invariants` are low-risk to keep open; focus
the change on auth, write, and config routes first.

## Resolution (2026-10-14)

- `monetization/src/worker.ts` now carries a `corsHeaders(request, env)`
  helper wired into every API response (auth, proxy, SSE, errors). With
  `ALLOWED_ORIGINS` set it reflects the origin only when listed; unset it
  keeps the legacy wildcard.
- Same allowlist implemented in `revenue-ledger`, `entitlement`,
  `capital-allocator`, and `config-gateway` (the latter now handles
  comma-separated lists and drops the `Access-Control-Allow-Credentials: true`
  + `*` invalid combination).
- `ALLOWED_ORIGINS` set in all four wrangler.toml files to the known origins
  (portal worker domain, p31ca.org, localhost dev, Capacitor).

## Remaining (owner)

Re-verify the origin inventory after the next deploy; add any new consumer
origin (e.g. a redeployed Astro dashboard) to each worker's `ALLOWED_ORIGINS`.

## Live verification (2026-10-15)

- `curl -H "Origin: https://evil.example" revenue-ledger/health` → no
  `Access-Control-Allow-Origin` header.
- `curl -H "Origin: https://p31ca.org" revenue-ledger/health` →
  `access-control-allow-origin: https://p31ca.org`.
- Portal `/api/health/invariants` with an unknown origin → no ACAO header.
- All five workers redeployed with `ALLOWED_ORIGINS` var set.