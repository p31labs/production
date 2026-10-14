# fix: mcp-x402-gateway redeploy blocked — Cloudflare Secrets Store binding scope missing

<!-- P31-HEADER
id: p31_fix_plan_gateway_deploy_secrets_store_scope_20261011_v1.0
type: fix-plan
component: workers/mcp-x402-gateway
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`npx wrangler deploy` in `workers/mcp-x402-gateway` fails at version upload:

```
✘ A request to the Cloudflare API
  (/accounts/ee05f70c889cb6f876b9925257e3a2fa/workers/scripts/mcp-x402-gateway/versions)
  failed.
  Secrets store binding authorization failed. Check your permissions and
  secret scopes. [code: 10021]
```

The gateway's `wrangler.toml` binds `LOVE_AUTH_SECRET` from the Cloudflare
Secrets Store (`[[secrets_store_secrets]]`, store
33d48162fd6842869beeed3516e2909c). The available OAuth token
(trimtab.signal@proton.me, `/home/p31/.wrangler/config/default.toml`) has
scopes `user:read offline_access account:read workers:write
workers_kv:write workers_routes:write workers_scripts:write workers_tail:read
d1:write pages:write zone:read ssl_certs:write ai:write queues:write
pipelines:write` — no Secrets Store scope. Direct probes confirm the token
cannot reach the Secrets Store API at all
(`wrangler secrets-store store list --remote` → Authentication error 10000).

## Evidence

- Gateway deploy 2026-10-11 → error 10021 above (bundle uploaded, version
  creation rejected at binding validation).
- `wrangler secrets-store store list --remote` → 10000 (token cannot even
  list stores).
- The store itself is **zero-read** (see `workers/secret-rotator` — the
  previous secret value is not retrievable), so switching the binding to a
  plain `wrangler secret put LOVE_AUTH_SECRET` is impossible without
  rotating the secret — which would break the first-party renderer and the
  shared HMAC with love-ledger until coordinated.

## Impact

The two-challenge CBS settlement code for the gateway
(`src/cbs-settlement.ts`, `src/taler-cbs/loader.ts`, LOVE router in
`src/index.ts`) is complete and `tsc --noEmit`-green but **NOT deployed**.
The deployed gateway still runs the pre-CBS code until this is resolved. The
ledger and bridge halves are deployed and verified live.

## Impact (secondary — OAuth 2.1 wave, 2026-10-12)

The OAuth 2.1 fleet rollout (runbook
`docs/enterprise/api/oauth-21-rollout-runbook.md`) landed **source-only** for
this worker: RFC 8414 + RFC 9728 routes (`src/index.ts:712-722`), the
RFC 8707 + RFC 9207 bearer gate in `app.post("/mcp")` (`:601-609`), SEP-2243
x-mcp-header forwarding on both bridge paths (`:352-357`, `:610-616`), and
`RESOURCE_ID`/`OAUTH_JWKS_URL` documented in `[vars]`. `tsc --noEmit` and
`wrangler deploy --dry-run` are green, but the changes queue behind the same
Secrets Store block below — they take effect on the first deploy that
resolves this scope. Live probes of the gateway's well-known routes are
therefore impossible until then (recorded in
`docs/fix-plans/mcp-servers-oauth21-iss-cimd.md`).

## Fix

Needs owner action with a credential that carries the Secrets Store scope
(e.g. an API token with Secrets Store:Edit / the account owner's OAuth
grant, or a GitHub Actions `CLOUDFLARE_API_TOKEN` per
`docs/DEPLOYMENT_RUNBOOK.md`):

1. `cd workers/mcp-x402-gateway && npx wrangler deploy`
2. Verify `GET /health` → 200.
3. Run the gateway leg of the smoke: `LOVE_AUTH_SECRET=<secret> node
   scripts/cbs-settlement-smoke.mjs` (C1–C3) — needs the shared HMAC secret
   value, which is not readable from this environment (zero-read store).
4. Close this fix-plan.

## Impact (secondary)

Until the deploy lands, LIVE LOVE-settled paid MCP calls still carry the old
random-UUID header (the original placeholder). The bridge now IGNORES
absence-of-verification only for requests WITHOUT `X-LOVE-Signature`; the
deployed gateway's old code DOES send a (fake) signature header on paid LOVE
calls, so once this deploy lands the transition is immediate — but note the
deployed old gateway + new bridge combination is UNCHANGED in behavior
(the bridge's new enforcement only triggers on the NEW signature format,
which fails local verification → 403 for the old UUID header). Until the
gateway redeploys, the bridge must therefore keep rejecting old-format
signatures (fail closed) — LOVE paid-tool calls are temporarily 403'd for
the old gateway version. This is the intended hard-cutover posture: the
gateway deploy + secret-scope fix resolves it.
## Resolution (2026-10-12)

Owner provided a token with token-creation scope; a **minimal** replacement
token was created via the API: name `p31-gateway-deploy`, account-scoped to
`ee05f70c889cb6f876b9925257e3a2fa`, permissions Secrets Store Write+Read,
Workers Scripts Write, D1 Write, **IP-locked** to this box (IPv4 /32 + IPv6
/128 + /64). Stored 0600 at `/home/p31/.secrets/cf-gateway-deploy.token`
(not in git). `wrangler deploy` with this token → success, gateway version
`bc43b27a-ea9d-47be-9fec-309408c5224a`. Verified live: `/health` 200,
initialize 2026-07-28, free tools/call end-to-end through the gateway.

Remaining: smoke **leg C** (LOVE-settled paid call) still needs the
plaintext `LOVE_AUTH_SECRET` (Secrets Store API returns 10001 to all tokens
— the zero-read posture). Owner action: run leg C with the secret in env,
or coordinate a rotation of `LOVE_AUTH_SECRET` (gateway binding + renderer
HMAC side together).
