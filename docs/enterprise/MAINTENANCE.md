# Doc Maintenance

Enterprise doc sets die when nobody knows whose job it is to update them. This
file is the ownership contract. Every doc has an owner, an update trigger, and
a review cadence. If you touch the code, check the trigger column first.

## Ownership map

| Doc | Tier | Owner | Update trigger | Review cadence |
|---|---|---|---|---|
| `README.md` | Core | @phos-ai-proxy | New subsystem / endpoint / CLI flag | Quarterly |
| `MAINTENANCE.md` | Core | @phos-ai-proxy | Ownership changes | Annual |
| `STATUS.md` | Core | @phos-ai-proxy | Any Shipped/Planned/Gap change | Per change |
| `CHANGELOG.md` | Set-and-forget | @phos-ai-proxy | Any substantive doc change | Per change |
| `conventions.md` | Set-and-forget | @phos-ai-proxy | New pattern / term | Annual |
| `p31-glossary.md` | Set-and-forget | @phos-ai-proxy | New P31-wide term | Annual |
| `architecture/00-overview.md` | Core | @phos-ai-proxy | Container added/removed (C4) | Per ADR |
| `architecture/01-tetrahedral-engine.md` | Core | @phos-ai-proxy | Vertex / axis / gate change | Per ADR |
| `architecture/02-training-loop.md` | Reference | @phos-ai-proxy | Loom event-kind or data-flow change | Per change |
| `adr/0001`–`0005` | Core | Decision author | Never (immutable — supersede, don't edit) | — |
| `api/api-reference.md` | Reference | @phos-ai-proxy | `/vision` / `/models` contract change | Per change |
| `api/cli-reference.md` | Reference | @phos-ai-proxy | `ui-forge.mjs` / `sic-povm-gate.mjs` flag change | Per change |
| `runbooks/RUNBOOK-sic-povm-gate.md` | Core | @phos-ai-proxy | Incident | Per incident + quarterly drill |
| `runbooks/RUNBOOK-vision-measurement.md` | Reference | @phos-ai-proxy | `/vision` / fallback-chain change | Per incident + quarterly drill |
| `runbooks/RUNBOOK-rldf-training.md` | Reference | @phos-ai-proxy | Export path / reward-model change | Per change + quarterly drill |
| `design-system/contract.md` | Reference | @canon-owner | Canon contract change | Per change |
| `design-system/token-architecture.md` | Reference | @canon-owner | Token / registry change | Per change |
| `operations/slos.md` | Set-and-forget | @phos-ai-proxy | SLO breach / measurement change | Quarterly |
| `operations/monitoring.md` | Set-and-forget | @phos-ai-proxy | Metric added/removed | Quarterly |

## Rules

1. **ADRs are immutable.** Once `Accepted`, a decision is not edited. A change
   requires a superseding ADR that marks the old one `Superseded`.
2. **Every runbook has a `Last drilled` date** that reflects an actual drill
   (per the repo's own `runbooks/RUNBOOK-TEMPLATE.md`). A runbook that has not
   been drilled is furniture.
3. **Core docs must be current before a deploy.** A UI change that adds a
   vertex, axis, or gate step updates `architecture/01` in the same change.
4. **STATUS.md is the single source of truth** for shipped vs planned vs gaps.
   Do not duplicate that list in other docs — link to it.
5. **Reference docs may lag** — that is their contract ("accurate as of last
   update"). Core docs may not lag.

## How to update

- **Architecture:** edit the doc, update the C4 Mermaid inline, bump the
  "Last verified" date.
- **Runbooks:** edit the doc, re-drill, update "Last drilled".
- **ADRs:** never edit; write a new `000N-supersedes.md`.
- **API reference:** re-probe `/models` and verify the exact response shape
  before editing (a stale catalog is a lie).
- **Status:** move the item between Shipped / Planned / Known gaps.