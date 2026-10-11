# fix: software/ is a diverged stale mirror of live workers/ (crypto drift)

<!-- P31-HEADER
id: p31_fix_plan_software_mirror_stale_20261011_v1.0
type: fix-plan
component: software
status: open
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`software/` contains an older, diverged copy of code that also lives under the
live tree. Example: `software/workers/ledger-bridge/src/index.ts` predates the
`x-trace-id`/`mintPrivateSBT` changes present in `workers/ledger-bridge/src/index.ts`.
The cryptographic `kem.ts` was byte-identical until it was patched on 2026-10-11;
left unpatched it would have continued to ship the non-spec X-Wing combiner.

An auditor following any `software/...` path in the docs reads **different code**
than what is live — a correctness and honesty hazard.

## Evidence

- `software/workers/ledger-bridge/src/index.ts` vs
  `workers/ledger-bridge/src/index.ts` — differs (missing trace-id + `mintPrivateSBT`).
- `nodes in docs` cite `software/workers/...` (e.g. `docs/PQC-POSITIONING.md`),
  now repointed to `workers/`.
- STATE.md: "`workers (1)` is the FULL 173-worker fleet, NOT a duplicate —
  `workers/` is a stale 2-worker subset. Do NOT delete `workers (1)`." — the same
  duplicate-hazard class applies to `software/`.

## Fix (partial, applied)

Patched `software/workers/ledger-bridge/src/kem.ts` to the spec X-Wing version so
no non-compliant combiner remains in that tree.

## Fix (required, open)

Decide the mirror's fate with a human:
1. **Reconcile** `software/` to the live tree (risky — large diff, disk is full), or
2. **Archive/remove** `software/` and repoint the few docs that reference it.

Until decided, do not treat `software/` paths as authoritative in docs.

## Impact

- Stale code in a mirror can silently re-introduce fixed vulnerabilities and
  mislead reviewers.
