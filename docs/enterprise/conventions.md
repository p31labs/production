# Conventions & Glossary

Shared language and patterns. Definitions here are authoritative — if a term
is used differently elsewhere, this file wins.

## Patterns

### File naming
- `*.mjs` — Node ESM CLI / script / plain-JS module (ui-forge, gate, retry,
  rldf-train, sic-povm-gate).
- `*.ts` — TypeScript library / worker / portal code (vision.ts, loomEmit.ts,
  sandboxStore.ts).
- `*.md` — documentation. Runbooks MUST be `RUNBOOK-<topic>.md` (repo rule).
- ADRs MUST be `NNNN-<kebab-title>.md` with `NNNN` zero-padded (repo rule).

### ADR status vocabulary
`Proposed` → `Accepted` → `Deprecated` / `Superseded`. An ADR is immutable
once `Accepted`; a change is a superseding ADR, not an edit.

### Runbook convention
Every runbook has: Overview (alert name, severity, owner, last drilled),
Symptoms, Impact Assessment, Diagnostic Steps, Fix Steps, Escalation,
Post-Actions. `Last drilled` must reflect an actual drill.

### Token naming
`p31.<category>.<property>` — e.g. `p31.color.action.primary`,
`p31.radius.full`, `p31.motion.duration.fast`. Registry items store the bare
form (`surface.bg`); the schema namespaces to `p31.surface.bg`. A token a
component's contract does not allow is a falsification (non-compensatory).

### Loom event-kind naming
`<domain>.<action>` — e.g. `chat.send`, `chat.artifact.generated`,
`instrument.zone.place`, `control.mapping.set`. Additive extensions only:
new members never remove or retype existing ones (frozen union stays valid).
One writer per kind — agent kinds vs human kinds are enforced by the gate.

### Gate verdict vocabulary
- `pass` — all four axes report ≥ floor, no degraded axis, no corroborated
  critical, no major findings.
- `incomplete` — an axis collapsed (mean < floor) or is missing.
- `needs-review` — an axis is degraded (`degraded:true`, an instrument fault);
  a human must re-run with a healthy instrument.
- `needs-revision` — a corroborated critical finding or a major finding; the
  design must change.

### Commit message format
`<scope>: <summary>` — e.g. `vision: add cross-model fallback chain`,
`gate: needs-review on degraded axis`, `loomEmit: screenshotRef2 on edit`.

## For AI agents

The primary consumers of this doc set are AI agents — the same agents doing
the code work. If you are an agent reading these docs, this section is your
rules of engagement.

- **MAINTENANCE.md owners are humans.** Do not claim ownership, do not assign
  yourself as an owner. Propose updates; a human lands them.
- **ADR decisions are immutable.** Do not edit an `Accepted` ADR. If behavior
  must change, propose a superseding ADR that marks the old one `Superseded`.
- **Runbook fix steps are executable by agents** unless a step is marked
  `HUMAN ONLY`. Follow the 7-section structure; update the `Drill record` only
  when a drill actually happens — never backdate a drill.
- **The gate (`gate.mjs`) is pure and deterministic.** If you change it, the
  unit tests must pass before commit. Nondeterminism lives only in `/vision`
  measurement, which `needs-review` absorbs.
- **`STATUS.md` is the single source of truth** for shipped vs planned vs
  gaps. Do not duplicate that list elsewhere — link to it.
- **The canon is `@p31ca/canon`.** Do not hand-edit derived token files, CSS,
  or the registry; regenerate via `gen:tokens` / `gen:registry`.
- **Don't guess.** Every doc here is "accurate as of the last verified date."
  If a claim is not verifiable (missing `Last verified`, or `NOT YET DRILLED` /
  `NOT YET MEASURED`), treat it as aspirational and say so — do not assert it
  as fact.
- **New content**: a UI change that adds a vertex, axis, or gate step updates
  `architecture/01-tetrahedral-engine.md` in the same change (MAINTENANCE.md).

## Glossary

| Term | Definition |
|---|---|
| **SIC-POVM** | Symmetric Informationally Complete Positive Operator-Valued Measure. Four equiangular measurement effects (overlap |⟨ψⱼ|ψₖ⟩|² = 1/3) that are informationally complete — the outcomes fully determine the state. |
| **Generation tetrahedron** | Grounder → Dreamer → Governor → Shaper → Center. The four vertices are separate agents; "one mind doing all four collapses them into mush" (Mears). |
| **Measurement tetrahedron** | The four `/vision` specialists: layout-parity, sensory-safety, identity-surface, motion-interaction. |
| **Grounder** | Holds what's real — separates fact from assumption from gap. Never fills a gap with inference. |
| **Dreamer** | Reaches — generates K free-form candidate component trees. Resists converging. |
| **Governor** | Cuts — a non-compensatory falsifier. Marks candidates admissible/inadmissible by hard rules. Never a ranker. |
| **Shaper** | Gives form — applies the canon deterministically. Adds nothing new. |
| **Center** | Synthesis — produces the artifact + the named next gate. Never a vertex wearing two hats. |
| **Completeness gate** | The SIC-POVM informational-completeness check over the four axes. |
| **1/3-overlap corroboration** | A critical finding gates only when ≥2 specialists independently flag it. |
| **QBism** | Quantum Bayesianism — the design state is the shared belief of the four specialists, updated coherently. |
| **Degraded measurement** | A review that fell back to a different model/rubric, or returned the neutral `unmeasured`. Yields `needs-review`, never a silent pass. |
| **THAKI path** | Constrained decoding / registry-derived schema for validity, not fine-tuning. Research: 39/40 gate-pass with zero training vs 0/40 fine-tuned. |
| **Constraint Tax** | Constraining output raises validity but can lower fidelity; the fix is "reason free, constrain late". |
| **RLDF** | Reinforcement Learning from Designer Feedback (Apple pattern). A fine-tuned CLIP scores (rendered image, description) → reward. |
| **`degraded` flag** | Set on a `/vision` response when a fallback model/rubric was used, or a neutral failure occurred. |
| **`X-P31-Degraded`** | Response header mirroring Cloudflare AI Gateway's `cf-aig-step`, for CI/observability. |

P31-wide terms (LOVE, Spoons, Progressive disclosure, Tetrahedron Protocol,
Loom, Canon) live in [p31-glossary.md](p31-glossary.md).