# Service Level Targets — Tetrahedral Engine

Set-and-forget tier. Reviewed quarterly. Last verified: 2026-10-02.

> **Status: these are targets, not measurements.** None of these SLIs are
> tracked by an automated pipeline yet (monitoring.md is manual one-liner
> probes). An SLO without measurement is a wish, not a contract — so this file
> names the targets AND what it would take to measure each one. Until a metric
> collector exists, treat these as the roadmap, not a dashboard.

## SLO targets

| SLI | Target | Window | How it would be measured | Status |
|---|---|---|---|---|
| Vision measurement availability | 99.5% | 30d | `/vision` returns HTTP 200 (incl. neutral failure) | NOT YET MEASURED |
| Fallback-chain success | > 99% | 30d | `/vision` returns a real score (not `unmeasured`) | NOT YET MEASURED |
| Gate determinism | 100% | every run | identical inputs → identical verdict (gate is pure) | MEASURABLE — gate.mjs is pure; verify in unit tests |
| Vision latency | p95 < 30s | 7d | `/vision` response time | NOT YET MEASURED |
| RLDF capture | > 95% of artifacts | 30d | `chat.artifact.generated` events per artifact created | NOT YET MEASURED (needs real artifact traffic) |
| Deploy-gate false-block | < 5% | 30d | human override of a gate failure that was not a real defect | NOT YET MEASURED (needs an override log) |

## To measure these, you need

1. **A synthetic probe** for `/health` and `/models` (the one thing that is
   measurable today — see the vul-os lesson: a probe that returns a permanent
   zero is worse than absence).
2. **A request log** for `/vision` (status, latency, `verdict`, `degraded`)
   so availability / fallback-success / latency are computable.
3. **An override log** on the deploy gate (every human override + whether the
   gate was right) for the false-block rate.
4. **An artifact-event counter** for the Loom (`loom-events` length) for the
   RLDF capture rate.

## Error budget

- 99.5% availability = **~3.6 hours/month** of allowed unavailability.
- If the budget is exhausted: freeze feature work, fix reliability, then
  re-baseline.
- The gate is **fail-closed by design** (ADR 0001) — a platform outage converts
  to `needs-review`, which is budgeted under availability, not correctness.

## Notes on the numbers

- **Availability vs fallback success** are distinct: a neutral failure
  (`unmeasured`) still returns 200 (availability OK) but is a fallback-chain
  miss. The cross-model chain (llama → gemma → qwen) is what keeps
  fallback-success high when the primary has a platform incident.
- **Gate determinism at 100%** is achievable because `gate.mjs` is pure — the
  nondeterminism lives entirely in `/vision` measurement, which the fallback +
  `needs-review` semantics absorb.
- **RLDF capture** needs real artifact traffic; until the chat portal drives
  steady artifact creation, keep the target and track the raw count (see
  monitoring.md).

## Related

- [monitoring.md](monitoring.md) — the metrics behind these targets
- [RUNBOOK-vision-measurement.md](../runbooks/RUNBOOK-vision-measurement.md) —
  what to do when availability / fallback-success drops