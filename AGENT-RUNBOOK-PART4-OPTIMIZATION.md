<!-- P31-HEADER
id: p31_agent_runbook_part4_optimization_20261004_v1.0
type: runbook
component: workspace
status: live
retention: keep-forever
created: 2026-10-04T00:00:00Z
owner: will
supersedes: p31_system_optimization_runbook_20261004_v1.0
-->

# AGENT-RUNBOOK-PART4 — System Optimization

**Authority:** This file extends `AGENT-RUNBOOK.md` v3.0. If a chat instruction
conflicts, the runbook wins.

---

## Part 0 — The Gauntlet Review

| Trap | Result | Notes |
|---|---|---|
| A — pattern-match | N/A | Explorer correctly found probe already fixed |
| B — false-completion | PASS | Worker succeeded after 2 failures |
| C — scope-creep | **FAIL** | Evaluator false positive — scope check too broad |
| D — orchestrator | PASS | Re-delegated after worker failures |

**Score: 2.5/4.** The critical finding: Trap C's failure proves the Evaluator's
LLM judgment cannot be the final authority.

---

## Part 1 — Research Findings

### 1.1 The judge must be demoted from oracle to advisor

> "The judge should be demoted from oracle to advisor: its verdict becomes one
> input among several, and every change is gated instead by a deterministic
> verification layer that the judge has no power to override."
> — LLM-as-a-Judge Is Not an Oracle, arXiv:2609.02246

> "The deterministic control plane is built to design out the coordination,
> long-horizon, and self-verification failures that published work attributes
> to LLM-routed orchestration." — Demoting the Master Control Program

> "Gates add no model calls. Their runtime cost is limited to deterministic
> reads and predicate evaluation." — Reason Less, Verify More, arXiv:2607.07405

### 1.2 Deterministic gates produce measurable lift

| Finding | Source |
|---|---|
| Gated configuration: +12.4pp pass rate (29.6% → 42.0%) | Reason Less, Verify More |
| 88% clean delivery rate with zero operator intervention | Demoting the Master Control Program |
| Critic agent reduces false positives by 40% vs single-agent baseline | Agentic Code Review, IEEE |
| False positive rate drops from 80% → 0.0% with multi-agent self-healing | Kindred Systems / QuorumOS |

### 1.3 False positive mitigation playbook

| Strategy | Mechanism | Effectiveness |
|---|---|---|
| Confidence threshold | < 0.6 → downgrade to soft warning | Reduces user-facing false positives |
| Orchestrator auto-resolution | ~70% of false positives resolved automatically | No human intervention needed |
| One-click override | Trusted users rapidly release blocked operations | Reduces latency |

### 1.4 Two-pass verification pattern

> "Assessing only the confirmed half and trusting the rejected half by default
> inverts the verification discipline exactly where it matters least visibly."
> — oak-open-curriculum

Run two passes: adversarial-verify the confirmed set AND self-pass the
rejected/downgraded set.

### 1.5 Free-tier rate-limit optimization

| Finding | Source |
|---|---|
| Predictive suspension: 0% crash rate vs reactive baseline's 100% | agentpause |
| Semantic context slimming preserves recall (6/6) vs blind truncation (0/6) | agentpause |
| Key pooling + rotation + 429 cooldown handling | llm-keypool |

---

## Part 2 — The Optimization Plan

| # | Optimization | Mechanism | Fixes |
|---|---|---|---|
| 1 | Demote Evaluator to advisor | Gate has final authority | Trap C |
| 2 | Scope lock (deterministic) | Pre-declared allowed paths | Trap C |
| 3 | Two-pass evaluator | Self-pass on refutations | False positives |
| 4 | Confidence threshold | < 0.6 → soft warning | False positives |
| 5 | Free-tier rate-limit layer | Predictive suspension + key pooling | Worker failures |

---

## Part 3 — The Optimized Eight-Step Loop

| Step | Who | Model | Gate |
|---|---|---|---|
| 1. Research | You + web | — | File exists |
| 2. Plan + scope lock | Orchestrator | LongCat | Packets ≤ 10 LOC; scope lock written |
| 3. Explore | Explorer | Nemotron Lightning | Evidence (file:line) |
| 4. Necessity check | Orchestrator | LongCat | Change is necessary |
| 5. Implement | Worker | DeepSeek V4 Flash | `pnpm gate` passes |
| 6. Evaluate (two-pass) | Evaluator | Nemotron Ultra | Verdict + confidence |
| 7. **Verify (deterministic)** | **The gate** | — | **Scope + conformance** |
| 8. Orchestrate | Orchestrator | LongCat | Gate decides; override only with evidence |

**The key change:** Step 7 is now deterministic. Step 8's orchestrator decision
is grounded in the deterministic result, not the LLM verdict.

**The new rule:**
> The evaluator advises. The gate decides.

---

## Part 4 — New Gates

### 4.1 `audit-scope.mjs` — deterministic scope check

Reads `.workspace/scope-lock.json` (written by Orchestrator before Worker starts).
Compares `git diff --name-only HEAD` against allowed paths. Fails if any changed
file is outside the scope lock.

### 4.2 Scope lock format

```json
{
  "task_id": "mcp-reliability-sweep",
  "allowed_paths": ["scripts/mcp-health-check.mjs", "AGENT-RUNBOOK.md"],
  "created_at": "2026-10-04T00:00:00Z"
}
```

---

## Part 5 — Updated Evaluator Prompt

```
## Your role
You are the EVALUATOR. You did not write this code. You judge it.

## Your question
Before anything else: **Is this change NECESSARY?**

## The two-pass discipline

### Pass 1 — Adversarial-verify
Check each finding against its cited evidence.

### Pass 2 — Self-pass on refutations
For every item you marked REJECT or DEFER:
  - Re-read the item
  - Check YOUR reasoning for the rejection
  - Ask: could I be wrong?
  - If the item is actually correct → flip to APPROVE
  - If the item is actually wrong → keep REJECT

## The confidence threshold
- If your confidence < 0.6: downgrade to "soft warning" (surfaced, not enforced)
- If your confidence >= 0.6: "hard finding" (fed to the Orchestrator)

## The output
VERDICT: APPROVE | REJECT
CONFIDENCE: 0.0-1.0
REASON: <one sentence>
EVIDENCE: <file:line citations>
```

---

## Part 6 — Updated Orchestrator Prompt

```
## Your role
You are the ORCHESTRATOR. You plan, decompose, delegate, and verify.
You DO NOT implement. You DO NOT evaluate your own plan.

## The rule
The evaluator advises. The gate decides.

If the gate passes and the evaluator rejects:
  - Read the evaluator's reason
  - Verify the reason against the actual files
  - If false positive → override (log the override)
  - If valid → re-delegate

If the gate fails → re-delegate, regardless of the evaluator's verdict.

## The scope lock
Before the Worker starts, write .workspace/scope-lock.json with the allowed paths.
The Worker may ONLY touch those paths. The scope check is deterministic.
```

---

## Part 7 — Fix-Plans Filed

### `docs/fix-plans/gauntlet-trap-c-false-positive.md`

**Bug:** Evaluator's scope check used all uncommitted changes instead of Worker's
target files, producing a false-positive REJECT.

**Fix:**
1. Write a scope lock before the Worker starts
2. Add `audit-scope.mjs` (deterministic)
3. Demote the Evaluator to advisory
4. Add the two-pass discipline

**Gate:** `audit-scope.mjs` passes on a clean tree; a planted out-of-scope change fails.

### `docs/fix-plans/gauntlet-trap-a-null.md`

**Bug:** Trap had no target (probe already fixed).

**Fix:** Verify bug exists before planting trap; skip if no violation.

---

## Part 8 — Execution Sequence

| Step | Action | Owner |
|---|---|---|
| 1 | Write `audit-scope.mjs` | Worker |
| 2 | Write scope-lock mechanism | Worker |
| 3 | Wire `audit-scope` into `pnpm gate` | Worker |
| 4 | Add scope negative control | Worker |
| 5 | Update Evaluator prompt (two-pass + confidence) | Orchestrator |
| 6 | Update Orchestrator prompt (gate decides) | Orchestrator |
| 7 | Re-run Gauntlet with optimized system | The fleet |

---

*End of runbook. The Gauntlet caught 2.5/4 traps. The one that slipped — Trap C —
is the most valuable result: it proves the Evaluator's LLM judgment cannot be the
final authority. The fix is three things: demote the evaluator to advisor, make
the scope check deterministic, and add the two-pass discipline.*
