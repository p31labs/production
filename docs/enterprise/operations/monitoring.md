# Monitoring — What to Watch

Set-and-forget tier. Reviewed quarterly. Last verified: 2026-10-02.

## Core metrics

| Metric | Source | Alert threshold |
|---|---|---|
| `/vision` HTTP status | `/health` probe | non-200 for 3 consecutive probes |
| `/vision` neutral-failure rate | `verdict === 'unmeasured'` in responses | > 1% over 24h |
| Degraded rate | `X-P31-Degraded: true` header | > 10% over 24h (a model is flaky) |
| Gate verdicts | `visual-gate.mjs` / `sic-povm-gate.mjs` exit codes | any `needs-review` that requires manual override |
| RLDF capture count | `loom-events` in IndexedDB `settings` | count flat / falling for > 1 week |
| Model catalog drift | `GET /models` vs `api-reference.md` | catalog changed without a doc update |

## The one-liner probes

```bash
# Fastest engine check — 5-stage smoke, ~60s worst case, no long hangs
cd packages/ui-forge && node scripts/ui-forge-smoke.mjs        # online (liveness + offline stages)
cd packages/ui-forge && node scripts/ui-forge-smoke.mjs --skip-live   # fully offline, deterministic
cd packages/ui-forge && node scripts/ui-forge-smoke.mjs --live-scoring # also score a tiny image (costs Neurons)

# Proxy health
curl -s -m 10 https://phos-ai-proxy.trimtab-signal.workers.dev/health

# Catalog served
curl -s -m 10 https://phos-ai-proxy.trimtab-signal.workers.dev/models

# Swarm chain health
curl -s -m 10 https://mesh.p31ca.org/health

# Gate on a screenshot (exit 0 = pass)
cd packages/ui-forge && node sic-povm-gate.mjs --image <screenshot.png> && echo GATE-PASS
```

## What each signal means

- **Degraded rate up** → a fallback model/rubric is being used often; the
  primary (llama-3.2-11b) may be in a platform window. See
  [RUNBOOK-vision-measurement](../runbooks/RUNBOOK-vision-measurement.md).
- **Neutral-failure rate up** → every model in the chain is failing; that is a
  platform incident, not a design problem. The gate correctly reports
  `needs-review` (fail-closed).
- **RLDF capture flat** → `loomEmit` is not firing (browser IndexedDB quota,
  wiring, or no artifact traffic). See
  [RUNBOOK-rldf-training](../runbooks/RUNBOOK-rldf-training.md).
- **Gate needs-review requiring override** → either a genuine instrument
  fault (re-run with the primary) or a design issue the Center's `nextGate`
  names. See
  [RUNBOOK-sic-povm-gate](../runbooks/RUNBOOK-sic-povm-gate.md).

## Logging contract

- Platform flakes are logged with timestamps (feeds the fallback-success SLO).
- Every `nextGate` produced by the Center is recorded (the Loom `propose`
  body carries it) — this is the closed-loop signal.
- `X-P31-Degraded` is the CI/observability signal; treat it like Cloudflare AI
  Gateway's `cf-aig-step`.

## Related

- [slos.md](slos.md) — the SLIs these metrics back
- `docs/MONITORING.md` (repo root) — the broader P31 monitoring note