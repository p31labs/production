# fix: per-server OAuth governance metadata is partially backfilled — x402-gateway + CIMD tail

<!-- P31-HEADER
id: p31_fix_plan_oauth_metadata_backfill_20261011_v1.0
type: fix-plan
component: workers/mcp-registry
status: open
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

Lane A (runbook §4 A) requires `oauth {enabled, resource, authorization_servers}`
per catalog entry. The registry merge derives it from a static allowlist
(`P31_OAUTH_ENABLED` in `workers/mcp-registry/src/index.ts`) seeded from
`docs/enterprise/api/mcp-server-protocol-status.md`:

- **enabled: true** — bros, dads, p31-justice-hub, p31-crypto-mcp,
  phenix-wallet-mcp, marketplace-mcp (deployed OAuth 2.1 wave).
- **enabled: false** — everything else, including `x402-gateway`, whose OAuth
  is **source-only** because its redeploy is blocked on the Cloudflare Secrets
  Store token scope (see
  `docs/fix-plans/p31-fix-plan-gateway-deploy-secrets-store-scope.md`).

A static allowlist drifts: when a server lands OAuth (or the gateway
redeploys), the catalog lies until someone edits the set.

## Plan (follow-up)

1. When `mcp-x402-gateway` redeploys, flip `x402-gateway` into
   `P31_OAUTH_ENABLED` and set its resource to its `/mcp` URI.
2. Better: derive `oauth.enabled` from a live probe of
   `/.well-known/oauth-protected-resource` per remote server (cached with the
   health probe) instead of the static set — keep the static set as the
   offline fallback. Cheap, no new deps, truthful at edge time.
3. CIMD flag (runbook §8) — once the fleet converges on RFC 9728 CIMD, record
   it in the per-entry `oauth` metadata.

## Verification

- A catalog entry for a server serving `/.well-known/oauth-protected-resource`
  reports `oauth.enabled: true` with the right `resource` + `authorization_servers`.
- Gateway entry flips to `enabled: true` the day the gateway redeploys.