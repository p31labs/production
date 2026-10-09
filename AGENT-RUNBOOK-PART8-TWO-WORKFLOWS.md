<!-- P31-HEADER
id: p31_agent_runbook_part8_two_workflows_20261004_v1.0
type: runbook
component: workspace
status: live
retention: keep-forever
created: 2026-10-04T00:00:00Z
owner: will
supersedes: p31_two_workflow_convergence_runbook_20261004_v1.0
-->

# AGENT-RUNBOOK-PART8 — Two Converging Workflows

**Authority:** Extends PART5 (routing), PART6 (deployed wiring), PART7 (deployed
button). If a chat instruction conflicts, the runbook wins.

---

## Part 0 — What Exists (verified) vs. What's Missing

The two workflows are **not** greenfield. The seeds already ship:

| Piece | File | State |
|---|---|---|
| Brain-dump parser → elaborator → themes | `tools (1)/phos-forge/brain.mjs` | ✅ exists |
| Fractal parallel research | `tools (1)/phos-forge/jitterbug.mjs` | ✅ exists |
| The chain: dump → themes → deep-research | `phos-forge_brain-dump` MCP tool (mode=deep) | ✅ wired |
| Tetrahedron engine | `packages/ui-forge/src/center.mjs` | ✅ built + verified (offline/live/deployed) |
| Router | `tools (1)/phos-forge/router.mjs` | ✅ fixed + verified |

**The gap to "publishable, Gemini/Claude-grade":**

| Missing | Research source |
|---|---|
| Guided intake — user confirms interpretation + scope before agents spawn | Claude `/deep-research` skill, Gemini two-stage |
| Parallel *orthogonal* researchers (WHO/WHAT/HOW/WHERE/WHEN/WHY/LIMITS) | Anthropic multi-agent, WebWeaver dual-agent |
| Persistent Research Ledger (verified claims + unresolved gaps) | ACM Dossier |
| Fact-check gate (citation accuracy + independent verification) | faerie-eval |
| Publishable report writer + format | Gemini Deep Research |
| Machine-readable handoff block (report → spec) | P31's own convergence contract |

---

## Part 1 — Workflow A: Brain Dump → Publishable Report

### 1.1 The guided intake (seven steps, user-paced)

1. **Dump** — free text, voice, fragments, contradictions welcome.
2. **Interpret** — orchestrator returns one-sentence interpretation + applicable
   orthogonal dimensions. **User confirms before anything spawns.**
3. **Scope** — directions N, rounds L–H, wall-clock T. **User confirms.**
4. **Plan** — section-by-section outline, reviewable. **User may refine.**
5. **Research** — parallel researchers, round gates fire before each round.
6. **Verify** — citation spot-check + independent fact-check.
7. **Report** — the publishable artifact.

The rule that makes it *guided*: **the user reviews the interpretation and the
plan before any agent spawns.** `brain.mjs` currently skips steps 2–4 (it goes
straight from parse to elaborate). That's the polish.

### 1.2 The research architecture (dual-agent, not single-loop)

From WebWeaver (ICLR 2026): a **planner** interleaves evidence acquisition with
outline optimization; a **writer** composes section-by-section. Anthropic's
system adds **parallel orthogonal researchers** returning *file references, not
text*.

| Agent | Model (Workers AI) | Output |
|---|---|---|
| Planner | `nemotron-3-120b-a12b` | citation-grounded outline + memory bank |
| Researchers ×6–12 | `glm-4.7-flash` | `research_notes/N_*.md` (orthogonal dimensions) |
| Citation Verifier | `granite-4.0-h-micro` | verified/unverified flag per claim |
| Writer | `qwen3.8-27b` | the report |
| Reviewer | `gpt-oss-120b` | verdict |

`jitterbug.mjs` already does fractal branching; the polish is the *orthogonal
dimension assignment* (WHO/WHAT/HOW/…) and the *file-backed* return, so the
orchestrator reads notes, not raw findings.

### 1.3 The Research Ledger (persistent state)

From Dossier (ACM 2026): a persistent ledger that tracks verified claims,
contradictions, and gaps, updated as evidence lands.

```json
{
  "verified_claims": [ { "id": "c1", "claim": "...", "sources": ["..."], "confidence": 0.9 } ],
  "contradictions": [ { "id": "x1", "a": "c1", "b": "c2", "status": "unresolved" } ],
  "information_gaps": [ { "id": "g1", "question": "...", "priority": "high", "depth": 0 } ],
  "round": 3, "exhaustion_score": 2
}
```

Terminal condition: no new dimensions for 3 rounds **and** all frontier items
exhaustion ≥ 4.

### 1.4 The fact-check gate (publishability)

From faerie-eval: citation accuracy (30%) + factual accuracy (60%) + structure
(5%) + thoroughness (5%). False facts get an **exponential penalty** — a report
with 3 false facts and 2 unverifiable claims scores `base × 0.07` and fails.

Check | What it does
--- | ---
Source verification | fetch every cited URL — accessibility + content
Citation accuracy | does each claim's cited source actually support it
Independent fact-check | verify against the web, not just the cited source
Corroboration independence | 3+ agent-cited claims must come from distinct orgs

### 1.5 The report format

- Executive summary (200–350 words, grade 6–8)
- Key metrics (3–5 KPI cards)
- Body sections with inline `[N]` citations — **never bare URLs**
- Sources section (all URLs live here)
- Coverage statement — honest about what was and wasn't covered
- Limitations — what could not be verified

---

## Part 2 — The Convergence Point (the handoff block)

The report carries a machine-readable block. **The Grounder reads the block, not
the prose.**

```markdown
<!-- P31-HANDOFF
report_id: p31_research_spoon_tracker_20261004_v1.0
entities:
  - name: spoon
    fields: [level:number, state:string]
actions:
  - name: logSpoon
  - name: viewHistory
constraints: [calm-mode:true, spoon-aware:true]
gaps: [time-series granularity unspecified]
sources: 12
confidence: 0.87
-->
```

---

## Part 3 — Workflow B: Report → Built Artifact

The tetrahedron already exists and is verified end-to-end:

```
forge(spec) → Grounder → Dreamer → Shaper → Governor → gate → artifact
```

| Vertex | Role | Model |
|---|---|---|
| Grounder | facts/gaps/entities/actions | `glm-4.7-flash` |
| Dreamer | K candidate trees | `nemotron-3-120b-a12b` (binding) |
| Shaper | deterministic repair | — |
| Governor | admissibility cut | — |
| Gate | four-axis completeness | — |

The only new piece: `scripts/report-to-spec.mjs` — parse the handoff block into
the spec `forge()` expects. The prose is for humans; the block is the contract.

---

## Part 4 — Routing (Workers AI, free tier)

One router serves both workflows. Non-compensatory holds: evaluator ≠ worker.

| Role | Workflow A | Workflow B |
|---|---|---|
| Orchestrator/Planner | `nemotron-3-120b-a12b` | `nemotron-3-120b-a12b` |
| Researcher | `glm-4.7-flash` × N | — |
| Citation Verifier | `granite-4.0-h-micro` | — |
| Writer/Reviewer | `qwen3.8-27b` / `gpt-oss-120b` | — |
| Grounder | — | `glm-4.7-flash` |
| Dreamer | — | `nemotron-3-120b-a12b` (binding) |
| Evaluator | — | `qwen3.8-27b` (exclude worker) |

---

## Part 5 — The Gates

**Workflow A (new):**

| Gate | Proves |
|---|---|
| Scope declared | user confirmed interpretation + plan |
| Directions non-empty | the frontier has work |
| Citation spot-check | every sampled citation is supported |
| Fact-check pass | no false facts; unverifiable flagged |
| Handoff block valid | complete + parseable |

**Workflow B (existing):** `pnpm gate` — unchanged.

**Negative controls:** plant a dead citation → citation gate fails; plant a false
claim → fact-check drops below threshold; plant a missing entity → handoff gate
fails. A gate that cannot fail is furniture.

---

## Part 6 — The Execution Sequence

| Phase | Action | Owner |
|---|---|---|
| A1 | Add guided intake (interpret/scope/plan) to `brain.mjs` | Worker |
| A2 | Add orthogonal researchers + file-backed returns | Worker |
| A3 | Add Research Ledger (`research-ledger.json`) | Worker |
| A4 | Add fact-check gate (`scripts/research/verify.mjs`) | Worker |
| A5 | Add report writer + handoff block | Worker |
| A6 | Smoke-test Workflow A (offline + live) | The gate |
| B1 | Write `scripts/report-to-spec.mjs` | Worker |
| B2 | Smoke-test the full convergence | The gate |
| B3 | One real brain dump → report → artifact | The fleet |

---

## Part 7 — The One-Page Reference

- **Report is the MVP and the brief.** Workflow A's output feeds Workflow B.
- **Guided before spawn.** User confirms interpretation + plan.
- **Ledger is persistent state.** Verified claims + unresolved gaps.
- **Fact-check is the publishability gate.** False facts → exponential penalty.
- **Handoff block is machine-readable.** Grounder reads the block, not the prose.
- **Tetrahedron unchanged.** Workflow B reuses the verified `forge()`.
- **One router.** Both workflows share the fixed, verified router.
- **Evaluator advises; the gate decides.**
- **Honest coverage.** The report says what it covered and what it didn't.

*End of runbook. The two workflows already have seeds — `brain.mjs` (dump→themes),
`jitterbug.mjs` (fractal research), and `ui-forge` (tetrahedron). The polish is six
gaps: guided intake, orthogonal researchers, the Research Ledger, the fact-check
gate, the report writer, and the handoff block. Workflow A's report becomes the
Workflow B brief through that block.*