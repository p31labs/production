<!-- P31-HEADER
id: p31_enterprise_agent_runbook_20261004_v3.0
type: runbook
component: workspace
status: live
retention: keep-forever
created: 2026-10-04T00:00:00Z
supersedes: p31_enterprise_agent_runbook_20261004_v2.0, p31_agent_runbook_part2_20261004_v1.0, p31_agent_runbook_part3_20261004_v1.0
context: The governing document for the P31 agent fleet — safety, fleet orchestration, operational continuity, and the corrected delegation model
owner: will
-->

# P31 ENTERPRISE AGENT EXECUTION RUNBOOK v3.0

**Owner:** Will (the human principal)
**Scope:** All agent work in `/home/p31/production` and its fleet
**Authority:** This runbook supersedes any conflicting chat instruction. If a chat instruction conflicts, the runbook wins.

**Structure:** This v3 merge combines three source documents into one canonical runbook:
- **Parts 0–13** — from `AGENT-RUNBOOK.md` v2.0 (safety, fleet, gates)
- **Part 14** — from `AGENT-RUNBOOK-PART2.md` (operational continuity: MCP + theming)
- **Part 14** — from `AGENT-RUNBOOK-PART3.md` (the corrected delegation model)

---

## PART 0 — PURPOSE AND PRINCIPLES

**You think about creation. The architecture handles deletion, isolation, and accountability.**

| Principle | What it means | How enforced |
|---|---|---|
| No agent can delete | Agents propose; humans approve; the system recovers | The veto gate (tool-layer) |
| No arbitrary decisions | Every action is explicit, logged, reversible, human-gated | The hash-chained ledger + approval token |
| You orchestrate, don't babysit | Plan, assign, check the dashboard, approve merges | Git worktrees + task ledger + fleet dashboard |

## PART 1 — THE FIVE LOCKS

1. **Hybrid signing** — Ed25519 + ML-DSA-65 (ACP-SIGN-2.0). PQC attaches when reachable; Ed25519 always.
2. **All subsystems in parallel** — safety + fleet build concurrently; the dependency spine is enforced.
3. **The veto gate is tool-layer** — `tool.execute.before` hook; the agent cannot prompt-inject past it.
4. **Soft delete is default** — hard delete needs retention window + 2nd approval.
5. **One hash-chained ledger** — all consequential actions unified, tamper-evident.

## PART 2 — THE AGENT ROLES

| Role | Model | May edit? | Scope |
|---|---|---|---|
| Orchestrator | premium | No | Plans, dispatches |
| Router | scavenger | No | Classifies, routes |
| Worker | flash | Yes | Executes one packet |
| Evaluator | premium (different brain) | No | Judges the diff |
| Synthesizer | premium | No | Merges parallel outputs |

**Non-compensatory:** the evaluator must differ from the worker. **Every agent traces to Will.** Passport: `did:agent:<role>:<session>`.

## PART 3 — THE TETRAHEDRON

- V1 CAPTURE (Grounder) — named + header + content hash
- V2 SORT (Dreamer) — classified + manifest + ledger
- V3 SHAPE (Shaper) — retention + soft-delete + CAS version
- V4 GATE (Governor) — veto gate + token + verify-chain, then soft-delete

**Forbidden edge V1→V4:** an unclassified file can never be gated. The four faces (Coverage/Safety/Provenance/Policy) must all return true.

## PART 4 — THE SAFETY SUBSYSTEMS

### 4.1 The Veto Gate (`tool.execute.before` hook + `veto-check.mjs`)
Intercepts `rm -rf`, `git reset --hard`, `DROP TABLE`, `curl|bash`, `terraform destroy`. On a hit: write a `propose` ledger entry → deny via `permission.ask`. The agent must file a deletion proposal + get a human token. Whitelist-first, fail-safe.

### 4.2 Soft Delete (`lib/softdelete.mjs` + `soft-delete-check.mjs`)
Files move to `.trash/<ts>/`, header set `status: trashed`, ledger entry written. Restore = `mv` back. Hard delete needs 90-day window + 2nd approval.

### 4.3 CAS Store (`lib/cas.mjs`)
`.objects/<hash>/` content-addressed, dedup, versioned refs. Point-in-time recovery; deletion recoverable by construction.

### 4.4 Hash-Chained Ledger (`lib/ledger.mjs` + `verify-chain.mjs`)
RFC 8785 JCS canonicalization, prev-digest linkage, Merkle checkpoints every 100. Any edit breaks the chain.

### 4.5 Approval Token (`lib/token.mjs` + `approve.mjs`)
Ed25519 + ML-DSA-65 hybrid. Single-use, time-bound (15m), scope-bound. The agent can't forge it.

### 4.6 Agent Passport
`did:agent:<role>:<session>` bound to an Ed25519 key. Authority narrows, never expands.

### 4.7 Housekeeping v2 (`p31-housekeeping.sh`)
Soft-delete + CAS + token + verify-chain. Disk-tiered (70/85/95%).

### 4.8 The Gate Wiring
`pnpm gate` runs all sensors + the negative-control suite.

## PART 5 — THE FLEET ARCHITECTURE

- **Worktrees** — each task = own branch + dir + port + scratch DB
- **Task ledger** — SQLite, atomic claim
- **Conflict shield** — file leases + pre-commit guard
- **Merge coordinator** — sequential merge + auto-revert
- **Fleet dashboard** — zellij/tmux, one pane per agent

## PART 6 — THE WORKFLOW

Session start: read STATE.md → manifest → plan → `pnpm gate --dry-run`. Five-phase loop (Research→Plan→Explore→Implement→Review), no phase skips a gate. Handoff = file, never conversation. Byte-cap output, grep before read.

## PART 7 — THE GATES

`pnpm gate` = namecheck → frontmatter → fix-plan-scan → veto-check → verify-chain → token-check → soft-delete-check → audit-coverage → audit-safety → audit-provenance → audit-policy → audit-redundancy → negative-controls → verify-mcp-paths → theme-check.

**Negative controls (all proven fail-able):** planted rm -rf / ledger tamper / token-less execute / premature hard-delete / unfiled TODO / untagged plan / planted double-padded card.

## PART 8 — THE OWNERSHIP CONTRACT

**It's all our work. Every problem is filed work.** Any agent that discovers a bug writes `docs/fix-plans/<id>.md` before continuing. `fix-plan-scan` fails on unfiled markers.

## PART 9 — EMERGENCY OPERATIONS

Kill-switch (`touch .workspace/PAUSED`), per-portal pause, quarantine (git diff → stash), replay (git + plans + ledger).

## PART 10 — THE INCIDENT PLAYBOOKS

Unstyled face → token-conformance + canon CSS. Ported class → compose from canon. Disk 100% → pnpm prune + diff-before-delete + rclone. Bug-found-then-moved-on → fix-plan scan fails. Model outage → fallback walk. Rogue deletion → veto gate + restore from .trash/CAS + revoke passport.

## PART 11 — THE IMPLEMENTATION STATUS

### Safety layer

| Wave | Deliverable | Status |
|---|---|---|
| W11 | Veto gate + taxonomy | ✅ done |
| W12 | CAS store | ✅ done |
| W13 | Soft-delete | ✅ done |
| W14 | Hash-chained ledger + verify-chain | ✅ done |
| W15 | Ed25519 + ML-DSA-65 token | ✅ done |
| W16 | Housekeeping v2 | ✅ done |
| W17 | Wired into pnpm gate | ✅ done |
| W18 | pnpm approve CLI | ✅ done |
| W19 | Agent passport | ⏳ (ledger has actor; full signing pending) |
| W20 | Negative controls | ✅ done (6/6) |

### Fleet layer

| Wave | Deliverable | Status |
|---|---|---|
| M1–M6 | Worktrees, task ledger, leases, merge, dashboard | ⏳ next |

## PART 12 — THE COMMANDS

```bash
pnpm gate                                  # all sensors + negative controls
pnpm approve --proposal <id> --paths a,b --operation soft-delete   # issue a token
pnpm fleet spawn <task> --agent <role>     # create an isolated worktree
pnpm fleet status / attach                 # the dashboard
pnpm fleet verify-chain                    # ledger integrity
pnpm fleet restore <path>                  # restore from .trash/
```

## THE RULES

1. No agent can delete. 2. No arbitrary decisions. 3. Shell owns geometry, canon owns appearance. 4. No ported JSX. 5. Theming is a value swap. 6. Compositions in the feature, primitives in the canon. 7. Prose is advice, sensors are enforcement. 8. It's all our work. 9. Evaluator differs from worker. 10. Handoff = file, never conversation.

## PART 13 — OPERATIONAL CONTINUITY (MCP + THEMING)

**Source:** `AGENT-RUNBOOK-PART2.md`. The 8 local MCP servers were dead because their paths pointed at the nonexistent `production/` root — a spawn ENOENT, not a transport drop. Now enforced by `pnpm mcp:paths`, `pnpm mcp:health`, `pnpm mcp:restart`, and `pnpm theme-check`. The P31 Quantum skin lives in both the global themes dir and `production/.opencode/themes/` (project wins).

### 13.1 The Problem (root cause, verified on disk)

All 8 local stdio MCP servers in `opencode.jsonc` pointed at
`/home/p31/production/...` — a root that does not exist. The real
servers live at `production/cli/*` and `production/tools (1)/phos-forge/`. The
`-32000 Connection closed` errors were **spawn failures (ENOENT)**, not
transport drops.

### 13.2 The Layers

| Layer | File | What it does |
|---|---|---|
| Path gate | `scripts/verify-mcp-paths.mjs` | Asserts every server entrypoint exists |
| Health hook | `~/.config/opencode/plugin/mcp-health.mjs` | Probes on first use / on-failure, auto-restart w/ backoff, `mcp__status` + `mcp__reconnect` self-heal tools |
| Lifecycle manager | `~/.config/opencode/mcp-manager.mjs` | 30s ping · 5s timeout · 3-fail threshold · auto-restart · 1s→30s backoff (run as supervisor: `pnpm mcp:manage`) |
| Self-heal tools | via health hook `tool` hook | `mcp__status` + `mcp__reconnect` — the agent fixes drops itself |
| Theme | `~/.config/opencode/themes/p31-quantum.json` + `production/.opencode/themes/p31-quantum.json` | The P31 Quantum skin (project-scoped wins over global) |

### 13.3 The Plugin Load Rule (empirical, verified 2026-10-04)

opencode 1.18.34 plugin loader:
- Requires ESM `export default` for `.js`/`.mjs` plugins in the config dir.
- A CJS `module.exports = fn` plugin silently fails to load (`Plugin export is
  not a function`) — the veto gate and health hook were NEVER loaded until
  converted to ESM. The `pnpm gate` did not catch this because its gates test
  static scanners, not live plugin loading.
- Top-level `import` works; **do NOT export live bindings (`let`) by name** —
  it breaks the loader ("Plugin export is not a function").
- The config/dispose hook errors logged on every run are benign (they appear
  even with `plugin: []` — they come from opencode's default plugins).

### 13.4 The Veto Gate Fix (A')

`input.permission` does NOT exist on `PluginInput`. The old `permission.ask`
path was dead code; the throw is the only real block mechanism. Also fixed the
whitelist bypass: `echo ... | sh`, `cat x | sh`, and `node -e 'rmSync()'` used
to pass because SAFE_PREFIXES short-circuited the destructive scan. Now the
destructive + by-construction patterns are checked BEFORE the safe prefixes.

### 13.5 The Theme Tokens (from canon, cited on disk)

| Token | Value | Source |
|---|---|---|
| `--p31-bg` | `oklch(17% 0.03 55)` | `portals/shell/src/index.css:14` |
| `--p31-surface` | `#241c14` | `index.css:15` |
| `--p31-surface2` | `#3a2f1e` | `index.css:16` |
| `--p31-accent` | `#e2b74b` | `index.css:17` |
| `--p31-accent-green` | `#7ed99b` | `index.css:18` |
| `--p31-accent-red` | `#e48a80` | `index.css:19` |
| `--p31-text` | `#faf6ee` | `index.css:20` |
| `--p31-text-secondary` | `#cbbfae` | `index.css:21` |

Theme rule: any color claim must cite disk evidence (`index.css:NN`). The
`#171010` background is the hex family match for `oklch(17% 0.03 55)`.

### 13.6 The Gates

| Gate | Command | What it proves | Negative control |
|---|---|---|---|
| MCP paths | `pnpm mcp:paths` | Every server entrypoint exists | Wrong path → fails |
| MCP health | `pnpm mcp:health` | All servers probe healthy (JSON-RPC POST initialize) | `kill -9` a server → fails |
| MCP restart | `pnpm mcp:restart <server>` | A stopped server restarts | Bogus name → fails |
| MCP manage | `pnpm mcp:manage` | The lifecycle supervisor runs (auto-restart proven: `kill -9 bob` → `server:restart-succeeded`) | — |
| Theme valid | `pnpm theme-check` | Theme JSON validates | Malformed JSON → fails |

**Known outage (filed):** `x402-gateway` returns 502 on initialize — see
`docs/fix-plans/x402-gateway-502-outage.md`. The corrected JSON-RPC POST probe
honestly flags it; the old GET probe (`r.status < 500`) masked it as healthy.

### 13.7 The MCP Health State File

`~/.config/opencode/mcp-health-cache.json`:

```json
{
  "bob": { "status": "unhealthy", "lastCheck": 1759500000000, "failures": 3, "reason": "spawn ENOENT (path missing)" }
}
```

### 13.8 The Commands

```bash
pnpm gate                                        # all sensors + negative controls + mcp:paths + theme-check
pnpm mcp:paths                                   # server entrypoints exist
pnpm mcp:health                                  # all servers probe healthy (JSON-RPC POST)
pnpm mcp:restart <server>                        # restart a stopped server
pnpm mcp:manage                                  # run the lifecycle supervisor daemon
pnpm theme-check                                 # theme JSON valid
node ~/.config/opencode/mcp-manager.mjs status   # lifecycle manager state
```

### 13.9 The Rules

1. A disconnected MCP server is a **spawn problem first** — check the path before the transport.
2. The health hook is the first responder; the manager is the second; the agent (`mcp__reconnect`) is the third.
3. The project-scoped theme wins over the global theme (same filename, closer to CWD).
4. Every gate has a negative control that must fail.
5. The skin derives from canon tokens — never invent a color.
6. Plugins MUST be ESM (`export default`) and must not export live bindings by name.
7. A red `mcp:health` is a finding, not a bug in the gate — file a fix-plan (see x402-gateway).

## PART 14 — THE CORRECTED DELEGATION MODEL

**Source:** `AGENT-RUNBOOK-PART3.md`. This part governs the separation-of-concerns
model: the orchestrator plans and verifies, the worker implements, the evaluator
judges. It adds the necessity check, the redundancy gate, and the fallback chain.

### 14.0 The Diagnosis

#### What happened

A free-agent task was run end-to-end. The agent picked `ImportGoogleDialog.tsx` by
pattern-matching — it found a `<GlassCard>` without `<CardBody>` and declared the fix.
The change was wrong: `.import-dialog` already declares `padding: 1rem`, so the
`<CardBody>` added a second 24px of padding. The dialog now has 40px of internal
padding instead of 16px.

The evaluator (also a free model, same session) rubber-stamped it. Every check was
structural. None asked whether the change was necessary.

#### The root cause

One agent doing every job. No separation of concerns. The research is unambiguous:

> "Specialized agents with narrow tasks run more reliably than a single LLM trying to
> execute a massive, multi-step prompt." — Google Developers Blog

> "Models are often overconfident and conduct shallow exploration... consistent
> overconfidence and premature termination." — arXiv, Toward Interactive Understanding

#### What LongCat 2.5 is actually good at

| Strength | Evidence |
|---|---|
| Tool calling and orchestration | "Significantly better at tool calling and coordinating workflows" |
| Context understanding | "Generally understood project goals, architecture, and previous discussions much faster" |
| Next-step recommendations | "Regularly suggested logical follow-up actions, implementation steps, validation strategies" |
| Architecture feedback | "Stronger and more actionable recommendations... identified improvement opportunities" |
| Intent recognition | "Frequently inferred the objective behind my request even when instructions were incomplete" |

**LongCat 2.5 is an orchestrator, not a worker.** It should plan, decompose, delegate,
and verify. It should not implement. It should not evaluate its own work.

### 14.1 The Separation-of-Concerns Model

#### The five roles, five models

| Role | Model | Tools | May edit? | Owns |
|---|---|---|---|---|
| Orchestrator | LongCat 2.5 Preview Free | read, grep, glob, task | No | The plan, the packets, the delegation, the final verify |
| Explorer | Nemotron 3.5 Lightning Free | read, grep, glob | No | The evidence — actual violations, not pattern-matches |
| Worker | DeepSeek V4 Flash Free | read, write, edit, bash, grep, glob | Yes | The implementation of one packet |
| Evaluator | Nemotron 3 Ultra Free | read, grep, glob | No | The verdict — necessity + conformance |
| Synthesizer | MiMo-V2.5 Free | read, grep, glob | No | The merge when packets conflict |

#### The non-compensatory rules

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

#### The critical insight

> "Every meaningful change needs a concrete verification method (test, grep, CLI
> check). A change without a verification method is a change that cannot be confirmed
> to work." — arXiv

The ImportGoogleDialog change had no verification method beyond "the gate passed."
The gate checked structure, not intent.

### 14.2 The Redundancy Gate

#### The rule

A face may already implement the spacing contract via a class. If the class applied
to `<GlassCard>` declares `padding`, that class IS the contract. Do not double it.

#### The detector

The gate must:
1. Find the `<GlassCard className="X">`
2. Find the `<CardBody>` inside it
3. Resolve X to its CSS rule
4. Check if X declares padding
5. If both hold → the change is redundant

#### The gate spec — `audit-redundancy.mjs`

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

#### The negative control

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

#### The gate's limitation (honest)

The gate catches the specific double-padding pattern. It does not catch every
possible redundancy. The broader fix is the evaluator's prompt.

### 14.3 The Evaluator's Prompt (The Necessity Check)

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

### 14.4 The Fallback Chain

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

#### The rate-limit playbook

| Error | Action |
|---|---|
| 429 | Wait 30–60s, retry once, then fall through |
| 401 (promotion ended) | The model rotated out; use the next in the chain |
| 403 (FreeTierError) | Session limit hit; wait or restart |
| 500 (upstream) | The provider is down; fall through immediately |

#### The non-compensatory preservation

If the worker falls back to big-pickle, the evaluator cannot also be big-pickle in
the same session. The orchestrator tracks which model each role is using and
enforces the separation.

### 14.5 The Corrected Delegation Protocol

#### The eight-step loop

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

#### Step 4 is the new step

The orchestrator runs the necessity check before the worker implements:

1. Read the evidence packet
2. Read the target file's existing code
3. Read the CSS class applied to the target element
4. Ask: does the target already implement the contract?
5. If yes → No-go. If no → Go.

#### Step 6 is the strengthened step

The evaluator runs the same necessity check on the diff. Defense-in-depth.

### 14.6 The Gates (Updated)

#### The full gate chain

```
namecheck → frontmatter → fix-plan-scan → veto-check → verify-chain
  → token-check → soft-delete-check → audit-coverage → audit-safety
    → audit-provenance → audit-policy → audit-redundancy (NEW)
      → negative-controls → verify-mcp-paths → theme-check
```

#### The negative controls (updated)

| Gate | Negative control |
|---|---|
| Veto | Plant `rm -rf` → intercepted |
| Chain | Edit a ledger line → verify-chain fails |
| Token | Deletion without token → token-check fails |
| Soft-delete | Hard delete before window → fails |
| Fix-plan | Unfiled TODO → fix-plan-scan fails |
| Coverage | Untagged plan → audit-coverage fails |
| **Redundancy** | **Planted double-padded card → audit-redundancy fails** |

### 14.7 The One-Page Reference

#### The roles

| Role | Model | May edit? | Owns |
|---|---|---|---|
| Orchestrator | LongCat 2.5 | No | Plan, delegate, verify |
| Explorer | Nemotron Lightning | No | Evidence |
| Worker | DeepSeek V4 Flash | Yes | Implementation |
| Evaluator | Nemotron Ultra | No | Verdict (necessity + conformance) |
| Synthesizer | MiMo-V2.5 | No | Merge |

#### The rules

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

#### The commands

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

### 14.8 The First Corrected Task

**Task:** Add CardBody wrapping to the docs empty-state card
**File:** `portals/shell/src/features/docs/components/DocsSurface.tsx`
**Line:** ~175
**Change:** Wrap the empty-state `<p>` in `<CardBody>`
**Why necessary:** The `<GlassCard>` has no className, so no padding class exists
**Gate:** `pnpm gate` + audit-redundancy pass
**Evaluator:** Nemotron Ultra (answers the necessity question)

---

*End of runbook v3.0. Merged from AGENT-RUNBOOK.md v2.0, AGENT-RUNBOOK-PART2.md,
and AGENT-RUNBOOK-PART3.md. The ImportGoogleDialog change was wrong because one
agent did every job and the gate had no rule for double-padding. The fix is three
things: separation of concerns (LongCat orchestrates, DeepSeek implements,
Nemotron evaluates), the necessity check (does the target already implement the
contract?), and the redundancy gate (audit-redundancy.mjs with a negative control).*

<!-- P31-FOOTER
checksum: pending
related: p31_enterprise_agent_runbook_20261004_v2.0, p31_agent_runbook_part2_20261004_v1.0, p31_agent_runbook_part3_20261004_v1.0
audit_chain: https://p31-portal-shell.pages.dev/api/bus/verify-chain
-->
