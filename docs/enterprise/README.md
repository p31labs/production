# P31 Tetrahedral SIC-POVM UI Engine — Enterprise Docs

**Status:** Production-hardened · **Owner:** @phos-ai-proxy / vision-reviewer
**Last verified:** 2026-10-02

## What this is

A trainable, tetrahedral design engine that produces P31 quantum material-styled
frontends from any backend schema. It operates on **two nested tetrahedra**:

- **Generation tetrahedron** — `Grounder` (facts + gaps) → `Dreamer` (K free-form
  candidates) → `Governor` (non-compensatory admissibility) → `Shaper` (canon
  form) → `Center` (artifact + named next gate).
- **Measurement tetrahedron** — four `/vision` specialists (`layout-parity`,
  `sensory-safety`, `identity-surface`, `motion-interaction`) measuring a
  design across SIC-POVM-complete axes.

The **SIC-POVM completeness gate** links them: a design passes only when all
four axes report non-trivial probability mass. An unmeasured axis is an
incomplete state. A critical finding needs corroboration from ≥2 specialists
(the 1/3-overlap rule).

The theoretical foundation is published — the **Tetrahedron Protocol**
(Zenodo 2026-02-13) establishes SIC-POVM as the optimal qubit reconstruction
(4 equiangular measurements, overlap |⟨ψⱼ|ψₖ⟩|² = 1/3) and maps it to Maxwell
rigidity, Posner-molecule quantum biology, and triangulated network topology.

## I need to…

| Task | Read this |
|---|---|
| Deploy a new UI through the gate | [runbooks/RUNBOOK-sic-povm-gate.md](runbooks/RUNBOOK-sic-povm-gate.md) |
| Debug a `/vision` 502 or degraded measurement | [runbooks/RUNBOOK-vision-measurement.md](runbooks/RUNBOOK-vision-measurement.md) |
| Train / calibrate the reward model | [runbooks/RUNBOOK-rldf-training.md](runbooks/RUNBOOK-rldf-training.md) |
| Understand why the gate fails closed | [adr/0001-sic-povm-as-truth-layer.md](adr/0001-sic-povm-as-truth-layer.md) |
| Understand why the measurement survives a model outage | [adr/0006-cross-model-fallback-chain.md](adr/0006-cross-model-fallback-chain.md) |
| Call `/vision` or `/models` | [api/api-reference.md](api/api-reference.md) |
| Run `ui-forge.mjs` or `sic-povm-gate.mjs` | [api/cli-reference.md](api/cli-reference.md) |
| Add a new vision specialist | [architecture/01-tetrahedral-engine.md](architecture/01-tetrahedral-engine.md) |
| Change a design token | [design-system/token-architecture.md](design-system/token-architecture.md) |
| Understand the data flow end-to-end | [architecture/01-tetrahedral-engine.md](architecture/01-tetrahedral-engine.md) |
| Know what ships vs what is planned | [STATUS.md](STATUS.md) |
| Know who maintains which doc | [MAINTENANCE.md](MAINTENANCE.md) |

## Doc tiers

Docs are tiered so maintenance effort is explicit. **Core** docs must stay
current with every architectural change; **Reference** docs update when the
surface they describe changes; **Set-and-forget** docs are reviewed quarterly.

| Tier | Docs |
|---|---|
| **Core** | README, MAINTENANCE, STATUS, architecture/00-overview, architecture/01-tetrahedral-engine, adr/0001–0006, runbooks/RUNBOOK-sic-povm-gate |
| **Reference** | api/api-reference, api/cli-reference, architecture/02-training-loop, design-system/contract, design-system/token-architecture, runbooks/RUNBOOK-vision-measurement, runbooks/RUNBOOK-rldf-training |
| **Set-and-forget** | conventions, p31-glossary, CHANGELOG, operations/slos, operations/monitoring |

## Quick start

```bash
# Generate a UI from a backend spec
cd packages/ui-forge
node ui-forge.mjs --spec examples/spoon-tracker.json --k 4

# Run the SIC-POVM gate on a screenshot
node sic-povm-gate.mjs --image screenshot.png

# Run the full visual gate (deploy precheck)
cd tools/design-parity
node visual-gate.mjs
```

## Verified status (2026-10-02)

> **Verified locally, not by CI.** These are manual checks run on 2026-10-02,
> not a CI artifact. Re-run them to confirm current state; see
> [operations/monitoring.md](operations/monitoring.md) for the one-liner probes.

- 31/31 ui-forge tests · 76/76 chat portal tests · canon `tsc` clean
  (run `node --test test/*.test.mjs` in `packages/ui-forge`, `pnpm test` in
  `portals/chat`)
- `/vision` + `/models` live on `phos-ai-proxy`; default `llama-3.2-11b`,
  fallback chain llama → gemma → qwen, `X-P31-Degraded` header live-verified
- swarm-router V1–V5 live on `mesh.p31ca.org`
- Cross-links to the existing operator runbook:
  `runbooks/RUNBOOK-vision-design-team.md` (repo root)

## Related docs

- `runbooks/` (repo root) — the operator runbook index: `docs/RUNBOOKS.md`
- `packages/canon/docs/LUMI-TRAINING.md` — the QLoRA fine-tune path
- `packages/canon/docs/REFUSE-KIND-EXTENSION.md` — Loom event-kind extension rule