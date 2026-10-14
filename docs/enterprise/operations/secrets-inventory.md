<!-- P31-HEADER
id: p31_secrets_inventory_20261014_v1.0
type: runbook
component: enterprise-operations
status: live
retention: keep-forever
created: 2026-10-14T00:00:00Z
owner: will
-->

# Secrets Inventory — P31 Estate

**Owner-maintained. Last reviewed: 2026-10-14.** The single table of
record for every production secret in the estate: who owns it, where it
lives, which consumer uses it, and how often it rotates. Mirrors are
driven from this table via `scripts/mirror-secrets.mjs` +
`scripts/mirror-secrets*.manifest.json` (one manifest per worker).

## The key inventory

| Secret | Lives in | Consumers | Owner | Cadence |
|---|---|---|---|---|
| `LOVE_AUTH_SECRET` | Cloudflare **Secrets Store** (account-level store `33d48162fd6842869beeed3516e2909c`), bound by the gateway at `workers/mcp-x402-gateway/wrangler.toml:63-66` (`[[secrets_store_secrets]]`). Zero-read: no token can retrieve the value. | `mcp-x402-gateway` (HMAC gate, `src/love-auth.ts:27-55`), `love-ledger` (shared HMAC), first-party renderer (HMAC side of `X-Love-Auth-MAC`) | **will** (owner-executed) | 90 days, dual-credential window (default 24h) |
| `ROTATOR_SHARED_SECRET` | per-worker `wrangler secret` on `p31-key-rotator` today → **migrate to the Secrets Store** (see migration § in `secret-rotation-runbook.md`) | `p31-key-rotator` (`POST /genkey`, `/rotate` gate) | **will** | 180 days |
| `ENTITLEMENT_API_TOKEN` | per-worker `wrangler secret` on `mcp-x402-gateway` (`wrangler.toml` comment: "set via wrangler secret p") | gateway → `entitlement` worker service binding (`ENTITLEMENT_URL`) | **will** | 90 days |
| `CF_ACCESS_APP_AUD` | Cloudflare Access application config → Pages **environment variable** (never a worker secret; appears in browser redirects) | Access Pages plugin `_middleware.ts` on the governed surfaces (see `access-middleware-prep.md`) | **will** | Provision once per surface; rotate on compromise |
| `CF_ACCESS_TEAM_NAME` | Cloudflare Access team domain label → Pages env variable | same as above | **will** | Provision once; change only with team rename |
| `cf-gateway-deploy.token` | `/home/p31/.secrets/cf-gateway-deploy.token` (0600, never git). API token `p31-gateway-deploy`: account `ee05f70c889cb6f876b9925257e3a2fa`, scopes Secrets Store Write+Read, Workers Scripts Write, D1 Write, **IP-locked** (IPv4 /32 + IPv6 /128 + /64). | `wrangler deploy` in `workers/mcp-x402-gateway` (only credential with the Secrets Store scope on the box) | **will** | 90 days, or immediately on scope/IP change |

## Rules (from the rotation runbook)

- Values are **never** committed; scripts read them from env/stdin only
  (`scripts/mirror-secrets.mjs`, `scripts/key-rotate.mjs`).
- The Cloudflare API never returns secret values. If the current value is
  not in the owner vault, rotation is blocked until the consumer is
  checked (`docs/enterprise/operations/secret-rotation-runbook.md`
  §Preconditions).
- Agent smoke runs use fake values only (see leg-C negative-control
  evidence in `docs/fix-plans/p31ca-secrets-automation-2026-10-14.md`).

## Local development

Production uses the Secrets Store + wrangler secrets; **local** dev uses
`.dev.vars` (gitignored via `.gitignore:7-8`). Secrets Store bindings are
not available under `wrangler dev`; the gateway's `resolveSecret`
(`workers/mcp-x402-gateway/src/love-auth.ts:21-25`) already accepts a
plain string, so `.dev.vars` values flow through the same code path.

## Automation

- Mirror: `node scripts/mirror-secrets.mjs --manifest
  scripts/mirror-secrets.manifest.json [--yes]` — dry-run by default,
  pushes via `wrangler secret bulk` (wrangler ≥ 4.x; this box: 4.112.0).
- CI wiring: a GitHub Actions job exports the repo secrets into env and
  calls the mirror with `--yes` (self-healing deploys); the manifest's
  `source: "gha"` entries read them back by name.