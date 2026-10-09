<!-- P31-HEADER
id: p31_agent_runbook_part3_20261004_v1.0
type: runbook
component: workspace
status: live
retention: keep-forever
created: 2026-10-04T00:00:00Z
owner: will
supersedes: p31_free_agent_runbook_20261004_v1.0
-->

# AGENT-RUNBOOK-PART3 — The Corrected Delegation Model

**Authority:** This file governs all agent work in `/home/p31/production`. It extends
`AGENT-RUNBOOK.md` and `AGENT-RUNBOOK-PART2.md`. If a chat instruction conflicts, the
runbook wins.

---

## Part 0 — The Diagnosis

### What happened

A free-agent task was run end-to-end. The agent picked `ImportGoogleDialog.tsx` by
pattern-matching — it found a `<GlassCard>` without `<CardBody>` and declared the fix.
The change was wrong: `.import-dialog` already declares `padding: 1rem`, so the
`<CardBody>` added a second 24px of padding. The dialog now has 40px of internal
padding instead of 16px.

The evaluator (also a free model, same session) rubber-stamped it. Every check was
structural. None asked whether the change was necessary.

### The root cause

One agent doing every job. No separation of concerns. The research is unambiguous:

> "Specialized agents with narrow tasks run more reliably than a single LLM trying to
> execute a massive, multi-step prompt." — Google Developers Blog

> "Models are often overconfident and conduct shallow exploration... consistent
> overconfidence and premature termination." — arXiv, Toward Interactive Understanding

### What LongCat 2.5 is actually good at

| Strength | Evidence |
|---|---|
| Tool calling and orchestration | "Significantly better at tool calling and coordinating workflows" |
| Context understanding | "Generally understood project goals, architecture, and previous discussions much faster" |
| Next-step recommendations | "Regularly suggested logical follow-up actions, implementation steps, validation strategies" |
| Architecture feedback | "Stronger and more actionable recommendations... identified improvement opportunities" |
| Intent recognition | "Frequently inferred the objective behind my request even when instructions were incomplete" |

**LongCat 2.5 is an orchestrator, not a worker.** It should plan, decompose, delegate,
and verify. It should not implement. It should not evaluate its own work.

---

## Part 1 — The Separation-of-Concerns Model

### The five roles, five models

| Role | Model | Tools | May edit? | Owns |
|---|---|---|---|---|
| Orchestrator | LongCat 2.5 Preview Free | read, grep, glob, task | No | The plan, the packets, the delegation, the final verify |
| Explorer | Nemotron 3.5 Lightning Free | read, grep, glob | No | The evidence — actual violations, not pattern-matches |
| Worker | DeepSeek V4 Flash Free | read, write, edit, bash, grep, glob | Yes | The implementation of one packet |
| Evaluator | Nemotron 3 Ultra Free | read, grep, glob | No | The verdict — necessity + conformance |
| Synthesizer | MiMo-V2.5 Free | read, grep, glob | No | The merge when packets conflict |

### The non-compensatory rules

1. **The evaluator must be a different model than the worker.** Same model reviewing
   itself is theater.
2. **The orchestrator does not implement.** It plans, delegates, and verifies.
3. **The explorer returns evidence, not opinions.** It greps, reads, and cites
   file:line.
4. **The worker executes one packet at a time.** No multi-packet implementation.
5. **The orchestrator verifies the evaluator's verdict.** It doesn't rubber-stamp.

6. When a worker fails, the orchestrator RE-DELEGATES.
   - First try the next model in the fallback chain (muse-spark → big-pickle)
   - If the chain is exhausted, escalate to Will
   - NEVER implement directly. The orchestrator that picks up the worker's
     tool loses the distance needed to verify.

7. When you hit a wall you cannot cross, do NOT stop. Do everything you CAN do:
   - Fix what's locally fixable (the probe, the gate, the runbook)
   - File the external blocker as a fix-plan (docs/fix-plans/<id>.md)
   - Only then ask the human to cross the wall

### The critical insight

> "Every meaningful change needs a concrete verification method (test, grep, CLI
> check). A change without a verification method is a change that cannot be confirmed
> to work." — arXiv

The ImportGoogleDialog change had no verification method beyond "the gate passed."
The gate checked structure, not intent.

---

## Part 2 — The Redundancy Gate

### The rule

A face may already implement the spacing contract via a class. If the class applied
to `<GlassCard>` declares `padding`, that class IS the contract. Do not double it.

### The detector

The gate must:
1. Find the `<GlassCard className="X">`
2. Find the `<CardBody>` inside it
3. Resolve X to its CSS rule
4. Check if X declares padding
5. If both hold → the change is redundant

### The gate spec — `audit-redundancy.mjs`

```javascript
// scripts/audit-redundancy.mjs
//
// Fails if a <GlassCard className="X"><CardBody> pattern exists where X
// already declares padding in CSS. The class IS the contract; CardBody
// would double it.
//
// Negative control: a planted double-padded card fails.

import { readdirSync, readFileSync, lstatSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

// 1. Collect every class that declares padding, from every CSS file.
function collectPaddingClasses() {
  const classes = new Map(); // className → { file, line }
  for (const css of walkCss(ROOT)) {
    const content = readFileSync(css, 'utf8');
    const ruleRe = /\.([\w-]+)\s*\{([^}]*)\}/g;
    let m;
    while ((m = ruleRe.exec(content)) !== null) {
      if (/\bpadding\s*:/.test(m[2])) {
        classes.set(m[1], { file: css, line: content.slice(0, m.index).split('\n').length });
      }
    }
  }
  return classes;
}

// 2. Find every <GlassCard className="X"><CardBody> in .tsx files.
function findDoubleWraps() {
  const violations = [];
  for (const tsx of walkTsx(ROOT)) {
    const content = readFileSync(tsx, 'utf8');
    const re = /<GlassCard[^>]*className="([^"]+)"[^>]*>\s*(?:\n\s*)?<CardBody/gs;
    let m;
    while ((m = re.exec(content)) !== null) {
      violations.push({ tsx, className: m[1], line: content.slice(0, m.index).split('\n').length });
    }
  }
  return violations;
}

// 3. Cross-reference.
const paddingClasses = collectPaddingClasses();
const doubleWraps = findDoubleWraps();
let violations = 0;

for (const { tsx, className, line } of doubleWraps) {
  for (const cls of className.split(/\s+/)) {
    if (paddingClasses.has(cls)) {
      const { file: cssFile, line: cssLine } = paddingClasses.get(cls);
      console.error(`REDUNDANCY: ${tsx}:${line} wraps <GlassCard className="${cls}"> in <CardBody>, but .${cls} already declares padding at ${cssFile}:${cssLine}`);
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(`\naudit-redundancy: FAIL — ${violations} double-padded cards`);
  process.exit(1);
}
console.log('audit-redundancy: pass — no double-padded cards');
```

### The negative control

A planted double-padded card must fail the gate. Add to `negative-controls.mjs`:

```javascript
// 7. Redundancy: a planted double-padded card must fail audit-redundancy.
{
  const plant = join(ROOT, 'portals/shell/src/__planted_redundancy.tsx');
  writeFileSync(plant, '<GlassCard className="import-dialog"><CardBody><p>x</p></CardBody></GlassCard>');
  const r = run('audit-redundancy rejects double-padded card', 'audit-redundancy');
  check('audit-redundancy fails on double-padded card', r.blocked);
  unlinkSync(plant);
}
```

### The gate's limitation (honest)

The gate catches the specific double-padding pattern. It does not catch every
possible redundancy. The broader fix is the evaluator's prompt.

---

## Part 3 — The Evaluator's Prompt (The Necessity Check)

```
## Your role
You are the EVALUATOR. You did not write this code. You judge it.

## Your question
Before anything else: **Is this change NECESSARY?**

A change is necessary if the target does not already implement what the change adds.

## The check
1. Read the diff.
2. Read the target file's existing code (the surrounding context).
3. Read any CSS class applied to the target element.
4. Ask: does the target ALREADY implement this contract?
   - If yes → REJECT. The change is redundant.
   - If no → proceed to conformance.
5. If proceeding: does the change conform to the spec (imports, canon, gate)?
   - If yes → APPROVE.
   - If no → REJECT with the specific violation.

## The rule
A diff that adds a primitive the target already implements is a REJECT.
The gate passing is necessary but not sufficient. The gate checks structure.
You check intent.

## The output
VERDICT: APPROVE | REJECT
REASON: <one sentence>
EVIDENCE: <file:line citations>
```

---

## Part 4 — The Fallback Chain

```jsonc
{
  "fallbacks": {
    "orchestrator": ["longcat-2.5-preview-free", "big-pickle", "space-bunny-free"],
    "explorer": ["nemotron-3.5-lightning-free", "big-pickle"],
    "worker": ["deepseek-v4-flash-free", "muse-spark-1.3-free", "big-pickle"],
    "evaluator": ["nemotron-3-ultra-free", "big-pickle", "longcat-2.5-preview-free"],
    "synthesizer": ["mimo-v2.5-free", "big-pickle"]
  },
  "rateLimit": {
    "maxRetriesPerModel": 2,
    "backoffCapMs": 2000,
    "concurrency": 1
  }
}
```

### The rate-limit playbook

| Error | Action |
|---|---|
| 429 | Wait 30–60s, retry once, then fall through |
| 401 (promotion ended) | The model rotated out; use the next in the chain |
| 403 (FreeTierError) | Session limit hit; wait or restart |
| 500 (upstream) | The provider is down; fall through immediately |

### The non-compensatory preservation

If the worker falls back to big-pickle, the evaluator cannot also be big-pickle in
the same session. The orchestrator tracks which model each role is using and
enforces the separation.

---

## Part 5 — The Corrected Delegation Protocol

### The eight-step loop

| Step | Who | Model | Input | Output | Gate |
|---|---|---|---|---|---|
| 1. Research | You + web | — | external | `docs/plans/<feature>.md` | File exists |
| 2. Plan | Orchestrator | LongCat 2.5 | The plan artifact | Execution packets ≤ 10 LOC | Packets are granular |
| 3. Explore | Explorer | Nemotron Lightning | A packet | Evidence packet (file:line) | ≤ 20 lines quoted |
| 4. **Necessity check** | Orchestrator | LongCat 2.5 | The evidence | Go / No-go | **The change is necessary** |
| 5. Implement | Worker | DeepSeek V4 Flash | One packet | The diff | `pnpm gate` passes |
| 6. Evaluate | Evaluator | Nemotron Ultra | The diff + the plan + the necessity question | Verdict | APPROVE or REJECT |
| 7. Verify | Orchestrator | LongCat 2.5 | The verdict + the diff | Final approval | The verdict is sound |
| 8. Commit | Worker | DeepSeek V4 Flash | The approved diff | The commit | `pnpm gate` final |

### Step 4 is the new step

The orchestrator runs the necessity check before the worker implements:

1. Read the evidence packet
2. Read the target file's existing code
3. Read the CSS class applied to the target element
4. Ask: does the target already implement the contract?
5. If yes → No-go. If no → Go.

### Step 6 is the strengthened step

The evaluator runs the same necessity check on the diff. Defense-in-depth.

---

## Part 6 — The Gates (Updated)

### The full gate chain

```
namecheck → frontmatter → fix-plan-scan → veto-check → verify-chain
  → token-check → soft-delete-check → audit-coverage → audit-safety
    → audit-provenance → audit-policy → audit-redundancy (NEW)
      → negative-controls → verify-mcp-paths → theme-check
```

### The negative controls (updated)

| Gate | Negative control |
|---|---|
| Veto | Plant `rm -rf` → intercepted |
| Chain | Edit a ledger line → verify-chain fails |
| Token | Deletion without token → token-check fails |
| Soft-delete | Hard delete before window → fails |
| Fix-plan | Unfiled TODO → fix-plan-scan fails |
| Coverage | Untagged plan → audit-coverage fails |
| **Redundancy** | **Planted double-padded card → audit-redundancy fails** |

---

## Part 7 — The One-Page Reference

### The roles

| Role | Model | May edit? | Owns |
|---|---|---|---|
| Orchestrator | LongCat 2.5 | No | Plan, delegate, verify |
| Explorer | Nemotron Lightning | No | Evidence |
| Worker | DeepSeek V4 Flash | Yes | Implementation |
| Evaluator | Nemotron Ultra | No | Verdict (necessity + conformance) |
| Synthesizer | MiMo-V2.5 | No | Merge |

### The rules

- No agent can delete. Agents propose; humans approve; the system recovers.
- The orchestrator does not implement. It plans, delegates, and verifies.
- The evaluator must be a different model than the worker.
- Every meaningful change needs a verification method.
- The necessity check precedes implementation.
- The gate checks structure. The evaluator checks intent.
- The fallback chain must not break the evaluator/worker separation.
- It's all our work. Every problem is filed work.
- Handoff = file, never conversation.
- Prose is advice. Sensors are enforcement.

### The commands

```bash
# The gate (full)
pnpm gate

# The new gate (redundancy only)
node scripts/audit-redundancy.mjs

# The negative controls (prove the gates can fail)
node scripts/negative-controls.mjs

# MCP
pnpm mcp:paths
pnpm mcp:health

# The theme
pnpm theme-check
```

---

## Part 8 — The First Corrected Task

**Task:** Add CardBody wrapping to the docs empty-state card
**File:** `portals/shell/src/features/docs/components/DocsSurface.tsx`
**Line:** ~175
**Change:** Wrap the empty-state `<p>` in `<CardBody>`
**Why necessary:** The `<GlassCard>` has no className, so no padding class exists
**Gate:** `pnpm gate` + audit-redundancy pass
**Evaluator:** Nemotron Ultra (answers the necessity question)

---

*End of runbook. The ImportGoogleDialog change was wrong because one agent did every
job and the gate had no rule for double-padding. The fix is three things: separation
of concerns (LongCat orchestrates, DeepSeek implements, Nemotron evaluates), the
necessity check (does the target already implement the contract?), and the redundancy
gate (audit-redundancy.mjs with a negative control).*
