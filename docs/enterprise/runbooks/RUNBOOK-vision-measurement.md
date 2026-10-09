# Runbook: Vision Measurement Degraded / Unreachable

## 1. Overview
- **Alert name:** `vision-measurement-degraded`
- **Severity:** P2
- **Related services:** phos-ai-proxy, swarm-router, ui-forge gate
- **Owner:** @phos-ai-proxy
- **Last written:** 2026-10-02
- **Last verified:** 2026-10-02 (content verified against live probes; not yet drilled)
- **Drill cadence:** Quarterly (P2)
- **Drill status:** NOT YET DRILLED
- **Drill record:**
  - Date: (pending)
  - Participants: (pending)
  - Result: (pending — pass / partial / fail)
  - Issues found: (pending)
  - Estimated vs actual repair time: (pending)

## 2. Symptoms
- `/vision` returns `{ mean: 5, verdict: 'unmeasured', degraded: true }`.
- `X-P31-Degraded: true` appears in responses.
- `GET /health` fails or returns non-200.
- The gate reports `needs-review` (degraded axes).

## 3. Impact Assessment
- **Affected users:** the SIC-POVM gate and any portal review.
- **Business impact:** measurements degrade to neutral → `needs-review` → the
  deploy gate blocks (fail-closed). This is by design (ADR 0001).
- **Upstream/downstream:** all four specialists are affected; one unreachable
  axis collapses the whole measurement.

## 4. Diagnostic Steps

1. Check the proxy health:
   ```bash
   curl -s -m 10 https://phos-ai-proxy.trimtab-signal.workers.dev/health
   ```
   Expected: `{"status":"ok","service":"phos-ai-proxy"}`.

2. Check the model catalog is served:
   ```bash
   curl -s -m 10 https://phos-ai-proxy.trimtab-signal.workers.dev/models
   ```
   Expected: critique default `llama-3.2-11b`, detect default `moondream-3.1`.

3. Force a direct review and inspect the `degraded` + `runs` fields:
   ```bash
   node -e "console.log(JSON.stringify({image: require('fs').readFileSync('<png>').toString('base64'), median: 1}))" \
     | curl -s -X POST https://phos-ai-proxy.trimtab-signal.workers.dev/vision \
       -H "Content-Type: application/json" --data-binary @-
   ```
   - `degraded: true` → a fallback was used (see Fix, Scenario A).
   - `verdict: 'unmeasured'` → every model failed (see Fix, Scenario B).

4. Check the swarm chain (if calling through `mesh.p31ca.org`):
   ```bash
   curl -s -m 10 https://mesh.p31ca.org/health
   ```
   Expected: `{"status":"ok","worker":"swarm-router","k4_vertices":["V1","V2","V3","V4"],...}`.

## 5. Fix Steps

### Scenario A — degraded (a fallback model/rubric was used)
1. Confirm which model ran from `modelKey` in the response.
2. If the primary (`llama-3.2-11b`) was skipped, it may be flaky. Re-run with
   the primary forced; if it still fails, note the platform window.
3. The gate correctly reports `needs-review` — do NOT force a pass. Either
   wait for the platform to recover or manually review the screenshot.

### Scenario B — unmeasured (all models failed)
1. Check Cloudflare status for a Workers AI incident (llama-3.2-11b-vision has
   a documented history of 502 windows).
2. Verify the AI binding is configured:
   ```bash
   cd apps/phos/worker-ai-proxy && npx wrangler deploy --dry-run
   ```
   Expected: the `AI` binding listed.
3. If the proxy code changed, redeploy:
   ```bash
   npx wrangler deploy
   ```
4. Verify the swarm rewrite still targets exactly `/vision` (an exact pathname
   match): `apps/phos/worker-ai-proxy` only dispatches on `pathname === '/vision'`.

### Scenario C — unreachable route
1. Confirm the routing chain: `POST mesh.p31ca.org/api/vision/x` must reach
   the vision handler (400 `Missing image` on `{}`), not a swarm 404.
2. Use the **service binding** (`PHOS_AI_PROXY`) inside Workers — public
   worker-to-worker DNS fails with error 1042.

## 6. Escalation
- If `/vision` is down or degraded > 30 minutes: contact @phos-ai-proxy.
- Escalation: William R. Johnson.
- Cloudflare status: check the Workers AI incident page for model-specific
  outages.

## 7. Post-Actions
- Log platform flakes with timestamps (feeds the SLO for fallback-chain
  success).
- If a model became unreliable persistently, revisit the model catalog order
  in `vision.ts`.
- **Drill:** first drill before relying on this runbook. Fill the `Drill
  record` in §1 (date, participants, result, issues, estimated vs actual
  repair time). P2 → drill quarterly thereafter.