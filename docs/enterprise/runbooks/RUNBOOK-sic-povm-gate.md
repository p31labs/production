# Runbook: SIC-POVM Gate Failure

## 1. Overview
- **Alert name:** `sic-povm-gate-failed`
- **Severity:** P2
- **Related services:** ui-forge, phos-ai-proxy, visual-gate
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
- `visual-gate.mjs` exits non-zero with `✗ SIC-POVM gate: incomplete` or
  `⚠ SIC-POVM gate: needs-review`.
- `sic-povm-gate.mjs` prints `collapsed axes: ...` or `degraded axes
  (needs review): ...`.
- The deploy-precheck refuses a UI change.

## 3. Impact Assessment
- **Affected users:** operators running the deploy-precheck.
- **Business impact:** the deploy is blocked until the gate passes.
- **Upstream/downstream:** the chat portal artifact pipeline stops advancing.

## 4. Diagnostic Steps

1. Get the verdict:
   ```bash
   cd packages/ui-forge
   node sic-povm-gate.mjs --image <screenshot.png> --json
   ```
   Expected: JSON with `status`, `collapsedAxes`, `degradedAxes`, `state`.

2. Classify the failure:
   - `incomplete` → an axis collapsed (mean < floor) or is missing.
   - `needs-review` → an axis is degraded (instrument fault).
   - `needs-revision` → a corroborated critical or a major finding.

3. For `needs-review`, identify which axes are degraded and why. Read the
   Center's `nextGate` (or the gate's `issues`) for the named fix.

## 5. Fix Steps

### Scenario A — collapsed axis (design quality)
1. Read `nextGate` for the named action (e.g. `sensory-safety` →
   "reduce ambient opacity below 0.35").
2. Feed the action back to the Dreamer (the loop closes).
3. Re-run the gate. Expected: `status: pass`.

### Scenario B — degraded axis (instrument fault)
1. Check `/vision` health:
   ```bash
   curl -s https://phos-ai-proxy.trimtab-signal.workers.dev/health
   ```
   Expected: `{"status":"ok","service":"phos-ai-proxy"}`.
2. If the primary model is flaky, the fallback chain (llama → gemma → qwen)
   may have used a non-primary. Force the primary:
   ```bash
   node sic-povm-gate.mjs --image <screenshot.png>
   # P31_VISION_MODEL=llama-3.2-11b (default)
   ```
3. If the primary is unavailable, wait for the Cloudflare status window to
   clear (llama-3.2-11b has a documented incident history), then re-run.

### Scenario C — corroborated critical finding (design must change)
1. Read the `issues` array for the specific finding.
2. Fix the design.
3. Re-run the gate. Expected: `status: pass`.

## 6. Escalation
- If unresolved within 30 minutes: contact @phos-ai-proxy via #p31-eng.
- Escalation: William R. Johnson.
- Backup: @canon-owner.

## 7. Post-Actions
- Update this runbook if new information surfaced.
- If the failure was a platform flake, note it in the vision-measurement
  runbook's incident log.
- If the failure was a design-quality issue, record the `nextGate` action in
  the Loom (`propose` body already carries it).
- **Drill:** first drill before the next deploy. Fill the `Drill record` in
  §1 (date, participants, result, issues, estimated vs actual repair time).
  P2 → drill quarterly thereafter.