# fix: upstream listings are reference-only (no live probes) + usage counters stay out of the ledger — policy is implicit

<!-- P31-HEADER
id: p31_fix_plan_upstream_probe_volume_policy_20261011_v1.0
type: fix-plan
component: workers/mcp-registry
status: open
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

Two volume policies landed in Lane A/E as design decisions but are only
documented in code comments — they need an owner decision:

1. **Upstream reference listings are never live-probed.** Official-registry
   entries (`source: 'official'`) surface `health: 'unknown'`, `toolCount: 0`,
   `probed: false`, and cannot be called through the marketplace proxy
   (403 until registered). This honors aggregator etiquette (scrape hourly,
   don't probe hundreds of third-party servers per request) but the storefront
   lane (B) wants live badges on every card. On-demand `inspect-any-URL`
   (Lane B-2) covers single-server probes; a **bounded background prober**
   (cron trigger, one pass/hour over the upstream list, KV-cached) would
   upgrade the badges without per-request load — needs an owner decision.
2. **Usage counter writes do not enter the hash-chained ledger.** The bridge
   POSTs to `/internal/usage` are high-volume; ledgering every counter tick
   would blow the bounded audit chain (AUDIT_MAX 2000). Only
   approval/publish/usage-admin events carry SIEM fields into the
   transparency ledger; raw counters live in D1. If the enterprise wants
   per-call usage in the SIEM, route a sampled or aggregated batch (e.g.
   hourly rollups) into the ledger instead of raw ticks.

## Plan (follow-up)

- Decide + schedule the bounded background prober (cron) for upstream health,
  or accept `unknown` badges with `probed: false` rendered as "reference
  listing" on storefronts.
- Decide the usage SIEM posture (D1-only vs. hourly rollups into the ledger).

## Verification

- If the prober lands: upstream entries gain `health: up|degraded|down` with
  `checkedAt` fresher than 1h, still without per-request probing.
- If rollups land: `/transparency` gains periodic `usage-admin` events with
  aggregated counts, chain stays bounded.