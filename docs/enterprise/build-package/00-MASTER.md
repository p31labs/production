<!-- P31-HEADER
id: p31_enterprise_build_package_master_20261005_v1.0
type: runbook
component: workspace
status: live
retention: keep-forever
created: 2026-10-05T00:00:00Z
owner: will
-->

# P31 Enterprise Build Package — Master Runbook v1.0

**Authority:** This document defines the structure of the build package. If a
surface spec conflicts with this master, the master wins. If a chat instruction
conflicts, the master wins.

---

## Part 0 — The Thesis

**The agents are the interview candidates. The build package is the interview.**

If the package is precise, the agents execute it cleanly. If the output is wrong,
the package gets refined — not the agents. The package is the thing under test.

The package has one job: describe every surface and feature so precisely that
execution is **deterministic where it can be, bounded where it cannot**. The agent
supplies judgment only inside the bounded envelopes; everything else is a gate.

- **Simple** — one document tree, one template per document type, one protocol.
- **Elegant** — every choice grounded in a production pattern, nothing invented.
- **Repeatable** — the same structure for every surface, every wave, every agent.

---

## Part 1 — The Package Structure

One tree under `docs/enterprise/build-package/`. It follows the Diátaxis four
quadrants — Tutorials (learning), How-To (problem-solving), Reference (facts),
Explanation (understanding) — with the executable layer (runbooks) alongside.

```
docs/enterprise/build-package/
├── 00-MASTER.md                         # this document — index + protocol
├── 01-ARCHITECTURE.md                   # Explanation: the shell + surface model
├── 02-DESIGN-CONTRACT.md                # Explanation: the canon contract (Equinor pattern)
│
├── tutorials/                           # learning-oriented
│   └── 01-quickstart.md                 # "build your first surface in 10 minutes"
│
├── how-to/                              # problem-oriented
│   ├── add-a-surface.md
│   ├── wire-a-backend-worker.md
│   ├── add-an-mcp-tool.md
│   └── deploy-a-surface.md
│
├── reference/                           # information-oriented
│   ├── event-contract.md                # the AG-UI-aligned bus event union
│   ├── token-reference.md               # every --p31-* token
│   ├── component-catalog.md             # the canon compositions
│   ├── api-reference.md                 # every Pages Function endpoint
│   └── worker-catalog.md                # every worker + its routes
│
├── surfaces/                            # one spec per surface — the core
│   ├── _TEMPLATE.md
│   ├── studio.md  docs.md  sheets.md  slides.md  workspace.md
│   ├── mesh.md  family-chat.md  identity.md
│   ├── apps.md  games.md  arcade.md
│   ├── economy.md  sbt.md
│   └── audit.md  monetization.md
│
├── features/                            # one contract per cross-cutting feature
│   ├── _TEMPLATE.md
│   ├── authz.md  flags.md  otel.md
│   └── design-system.md  observability.md
│
├── runbooks/                            # executable — the Heimdall DAG pattern
│   ├── _TEMPLATE.md
│   ├── wave-1-studio.md
│   ├── wave-2-creation.md
│   ├── wave-3-productivity.md
│   ├── wave-4-mesh-family.md
│   ├── wave-5-economy-identity.md
│   └── wave-6-public.md
│
└── gates/                               # runnable assertions
    ├── _TEMPLATE.md
    ├── surface-gates.md
    ├── feature-gates.md
    └── wave-gates.md
```

**Why this shape:**

| Decision | Source |
|---|---|
| Diátaxis four quadrants | open-sharia-enterprise — "four distinct types (Tutorials, How-To, Reference, Explanation)" |
| One spec per surface | component-contracts — "one JSON contract per component" |
| Runnable runbooks separate from docs | Heimdall — "YAML workflows define phases, gates, artifacts" |
| Gates as first-class documents | @cleocode/playbooks — "deterministic nodes MUST have command + args" |

---

## Part 2 — The Four Document Templates

Four templates. Every document in the package is one of the four. No exceptions.

### Template A — The Surface Spec (`surfaces/_TEMPLATE.md`)

The AIOX Task Format adapted for a UI surface. Every surface — Studio, Docs, Mesh,
Economy — uses this exact shape.

```markdown
# Surface: <Name>

## Identity
- **Name:** <display name>
- **Slug:** <route slug>
- **Tier:** controlled | declarative | open
- **Audience:** <who uses this>
- **Purpose:** <one sentence>

## The MVP bar
<What "enterprise market-ready" means for THIS surface. 3-5 bullets.
A surface is not shipped until every bullet is true.>

## Objective
<One imperative sentence: what the agent must build.>

## Inputs
| Field | Type | Source | Required | Default |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

## Outputs
| Field | Type | Destination | Persisted |
|---|---|---|---|
| ... | ... | ... | ... |

## Procedure
<Numbered, imperative, MECE. One action verb per step. Each step names the
exact file or command.>
1. **Read** `<path>` — <what to look for>
2. **Create** `<path>` — <what it must contain>
3. **Wire** `<path>` — <the exact change>
4. **Run** `<command>` — <the gate>

## Specifications (postconditions)
- [ ] `<file>` exists and exports `<name>`
- [ ] `<gate command>` exits 0
- [ ] the deployed bundle contains `<string>`

## Acceptance criteria (runnable assertions)
| # | Assertion | Command | Expected |
|---|---|---|---|
| 1 | The surface renders | `curl -s <url> | grep <sel>` | match |
| 2 | The gate passes | `pnpm gate` | exit 0 |
| 3 | The surface is role-gated | `curl -s <url>?role=viewer` | forbidden |

## Forbidden actions
- Do not modify `<file>` — it is a shared contract.
- Do not add a dependency without a spec update.
- Do not touch a surface outside the scope lock.

## Required from the user
- Confirm the surface's audience.
- Approve the tier (controlled | declarative | open).

## The canon contract
<Which canon compositions this surface composes from. Link to component-catalog.md.>
- Frame: `GlassPanel`
- Items: `GlassCard` + `CardBody`
- Actions: `Button` (primary/ghost)
- Metadata: `StatusBadge` / `MetricBadge`
```

### Template B — The Feature Contract (`features/_TEMPLATE.md`)

The Equinor contract pattern — "an agent authors the contract; deterministic
emitters build the components; no agent runs in the build path."

```markdown
# Feature: <Name>

## The invariant
<One sentence. The property that must hold. This is what the tests assert.>

## The boundary
<What this feature does NOT do. The narrow-only rule for flags; the
fail-closed rule for authz.>

## The implementation
| File | What it provides |
|---|---|
| `<path>` | `<export name>` |

## The tests (negative controls in both directions)
| Test | Pass case | Fail case |
|---|---|---|
| `<name>` | <assert> | <assert> |

## The gate
```bash
<command>
```

## The escalation
<When this feature blocks an agent, what does it do?>
```

### Template C — The Executable Runbook (`runbooks/_TEMPLATE.md`)

The Heimdall / @cleocode/playbooks DAG pattern — every node is one of three
types: `deterministic` (command + args), `agentic` (a skill), `approval`
(a human gate). Every edge carries a contract.

```markdown
# Wave: <N> — <Name>

## The DAG

```yaml
version: "1.0"
name: wave-<N>-<slug>
inputs:
  - name: scope_lock
    required: true
    description: The allowed_paths for this wave
nodes:
  - id: read-specs
    type: deterministic
    command: cat
    args: [docs/enterprise/build-package/surfaces/<surface>.md]
  - id: build-surface
    type: agentic
    skill: surface-builder
    depends: [read-specs]
  - id: gate
    type: deterministic
    command: pnpm
    args: [gate]
    depends: [build-surface]
  - id: review
    type: approval
    prompt: "Surface built and gated. Approve the deploy?"
    depends: [gate]
  - id: deploy
    type: deterministic
    command: npm
    args: [run, deploy]
    depends: [review]
edges:
  - from: read-specs
    to: build-surface
    contract: { requires: [spec-exists], ensures: [surface-built] }
  - from: build-surface
    to: gate
    contract: { requires: [surface-built], ensures: [gate-green] }
error_handlers:
  - on: gate-failed
    action: abort
    message: "Gate red — surface not shipped. File a fix-plan."
```

## The nodes in prose
<The DAG above, explained for a human.>

## The gate
<The single command that proves the wave succeeded.>

## The evidence
<What to capture: the git diff, the gate output, the deployed check.>
```

### Template D — The Gate (`gates/_TEMPLATE.md`)

Every gate is one document — a runnable assertion with a negative control that
proves it can fail.

```markdown
# Gate: <Name>

## What it proves
<One sentence.>

## The command
```bash
<exact command>
```

## The pass condition
<What exit code / what output.>

## The negative control
<The planted violation that MUST make this gate fail.>
```bash
<plant command>
<gate command>  # MUST exit 1
<cleanup command>
```

## The escalation
<What the agent does when this gate fails.>
```

---

## Part 3 — The Execution Protocol

The agent consumes the package in one order, every time. No improvisation.

```
1. Read 00-MASTER.md                  → learn the package structure
2. Read 01-ARCHITECTURE.md            → learn the shell model
3. Read 02-DESIGN-CONTRACT.md         → learn the canon contract
4. Read surfaces/_TEMPLATE.md         → learn the spec shape
5. Read the one surface spec assigned → learn the surface
6. Read the one runbook assigned      → learn the wave DAG
7. Execute the DAG                    → deterministic nodes run; agentic nodes build;
                                         approval nodes pause for the human
8. Run the gate                       → the runbook's single command
9. File the evidence                  → the git diff + gate output
10. If the gate is red → file a fix-plan; do not proceed
```

**The one rule:** the agent reads only the documents the runbook names. It does
not wander. The package is the scope lock.

---

## Part 4 — The Gates

Three gate levels. Every gate has a negative control. Every negative control is a
planted violation.

| Level | Gate | Proves |
|---|---|---|
| Surface gate | `pnpm gate --surface <name>` | the one surface builds, renders, is role-gated, passes assertions |
| Feature gate | `pnpm gate --feature <name>` | the feature's invariant holds in both directions |
| Wave gate | `pnpm gate --wave <n>` | every node completed; every artifact exists; every approval recorded |

**The negative-control rule:** a gate is not shipped until a planted violation
makes it fail. A gate that cannot fail is furniture.

---

## Part 5 — The Iteration Loop

When the output is wrong, the package gets refined — not the agents.

```
The agent runs the wave
  ↓
The gate fails OR the human rejects the approval
  ↓
Analyze: agent error, or spec ambiguity?
  ↓
IF spec ambiguity → refine the surface spec (add the missing detail)
IF agent error    → the spec was right; re-run with the same spec
  ↓
Version the refined spec (v1.0 → v1.1)
  ↓
The next agent reads the refined spec and re-runs
  ↓
Repeat until the gate is green AND the human approves
```

**The job-interview framing:** the package is the interview. Every iteration makes
the interview sharper. A package the agents execute cleanly on the first read is a
good interview. A package that needs refinement is not a failure — it is the
interview doing its job.

**The versioning rule** (from `design-core/GOVERNANCE.md`): a spec change is a
semver change. A clarification is a patch. A new acceptance criterion is a minor.
A changed postcondition is a major.

---

## Part 6 — The First Wave

The first wave proves the package format works. It is the smallest slice that
exercises every template.

| Wave | Deliverable | Templates exercised |
|---|---|---|
| Wave 1 | The Studio surface (3-panel chat workbench) | Surface spec + Runbook + Gate |

The gate: `pnpm gate --surface studio` exits 0, and the deployed studio renders
the 3-panel workbench with the conversation timeline.

The evidence: the git diff, the gate output, and a screenshot of the deployed
workbench.

---

## Part 7 — The One-Page Reference

- **Structure:** Diátaxis four quadrants + `surfaces/` + `features/` + `runbooks/` + `gates/`.
- **Templates:** surface spec (AIOX), feature contract (Equinor), runbook (Heimdall/cantbook DAG), gate (negative-control).
- **Protocol:** read master → architecture → one surface spec → one runbook → execute DAG → run gate → file evidence.
- **Gates:** surface gate, feature gate, wave gate. Every gate has a planted violation that must fail.
- **Iteration:** if the output is wrong, refine the spec (not the agents), version it, re-run.
- **First wave:** the Studio surface — the smallest slice that exercises every template.
- **Thesis:** the package is the interview. Simple. Elegant. Repeatable.

---

*End of Master Runbook v1.0. Next: `01-ARCHITECTURE.md` (the shell + surface
model), then `surfaces/studio.md` (the first spec), then `runbooks/wave-1-studio.md`
(the first runbook). Build the package, then run the interview.*