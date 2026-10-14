<!-- P31-HEADER
id: p31_runbook_marketplace_production_hardening_20261012_v1.0
type: runbook
component: operations
status: live
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

# Marketplace Hub — Production Hardening Runbook (Wave 5)

**Status:** five items; two are owner-gated, two are operator steps, one is a
monitoring plan. Design passes (W1–W4) do not fix these.

## 1. Real sign-in (Cloudflare Access) — OWNER-GATED

Current: governed lens + publish gate use `ADMIN_SECRET` shared secret +
localStorage principal (filed: `mcp-marketplace-governed-lens-access-wiring.md`
and `registry-access-gate-follow-up.md`).

Steps (owner):
1. Create a Cloudflare Access application for `p31-portal-mcp-marketplace.pages.dev`
   and `mcp-registry.trimtab-signal.workers.dev` (same IdP: existing CF team).
2. Portal: `LensSwitch`/governed lens reads the Access JWT via a new
   `GET /identity` endpoint on the registry (which already has
   `verifyAccessJwt` — wire it to the real issuer, not the demo key).
3. Registry: replace `ADMIN_SECRET` bearer with Access JWT role claims
   (`roles:mapping:<group>` KV rows already exist in `getRole`).
4. Keep `ADMIN_SECRET` working for machine clients (CI smoke) — document the
   split human/machine identity model.

## 2. Registry probe alerting — OPERATOR (filed: registry liveness history)

Current: no alert when the registry's liveness probe fails (the 1042 break
was found by a CLI, not by monitoring).

Plan:
1. Add a cron trigger to `workers/mcp-registry` (wrangler `triggers.crons`)
   that runs the fleet probe every 15 min and writes `probe:down:<id>` events
   to the transparency ledger + a KV counter of consecutive failures.
2. `GET /internal/probe-state` (internal secret) returns servers with
   consecutive-failure ≥ 2. Wire a canary: the existing
   `scripts/mcp-health-check.mjs` exit code already gates deploys; extend it
   to read `/internal/probe-state` (takes 5 min to add once the cron ships).
3. Human alerting stays manual until a notifier is chosen (email/Slack) —
   the counter is the sensor; alerting is the receiver. File the receiver
   choice as an owner decision.

## 3. Secrets externalization + rotation — MOSTLY DONE

- `ADMIN_SECRET`, `INTERNAL_USAGE_KEY`, `BLIND_ISSUER_PRIVATE_KEY`,
  `LOVE_AUTH_SECRET` are deployed as wrangler secrets (not in git).
- `.dev.vars` files are local-dev only and gitignored — verify with
  `git check-ignore workers/*/.dev.vars`.
- Rotation runbook: `wrangler secret put <NAME>` + redeploy, then re-run
  `scripts/mcp-health-check.mjs` + CBS smoke. Rotate on owner cadence
  (quarterly) or on exposure. `INTERNAL_USAGE_KEY` rotation must also update
  the systemd unit `Environment=USAGE_INTERNAL_KEY` on the bridge host.

## 4. Backup/restore — OPERATOR

- D1 `mcp-registry-usage` (`usage_events`): `wrangler d1 export
  mcp-registry-usage --remote --output usage-backup-$(date).sql` weekly.
  Restore: `wrangler d1 execute --remote --file <backup>` after dropping.
- Registry KV (catalog, health, baselines, roles): export via a new cron
  task in the registry (list keys → JSON dump to R2 or a D1 table) — R2
  binding is the intended store; file an owner decision if R2 isn't enabled.
- love-ledger D1 (accounts + love_chain): already exported in the existing
  ops cadence; confirm the cadence covers it (see docs/ops/OPERATIONS-RUNBOOK.md).
- Restore drill: quarterly — restore usage DB + KV dump into a staging
  binding and verify `/analytics/tools` reads it.

## 5. Gateway redeploy — OWNER-GATED (blocking LOVE path)

`mcp-x402-gateway` deploy is blocked on a Cloudflare API token with
Account > Secrets Store > Edit (error 10021). Owner creates the token →
`wrangler deploy` from `workers/mcp-x402-gateway` → run
`scripts/cbs-settlement-smoke.mjs` leg C → LOVE-settled path returns 200
instead of 403.

## Dependency ordering

1 (owner) → gateway redeploy (5, same token class) → smoke leg C. 2 and 4 are
independent operator work. 3 is done until first rotation.