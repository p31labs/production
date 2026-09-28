# RUNBOOK-gate-self-test

## When to use
You added a gate, changed a gate, or found a gate that reported pass and you
suspect it measured nothing.

## Prerequisites
- The gate command exits non-zero on a real violation (or the registry's
  `negative-controls/` script for that gate exists).

## Steps
1. Run `pnpm gate:self-test` — it runs every registry gate's negative control.
2. If a gate is reported `GATE IS FURNITURE`, it passed its own negative
   control: it measured nothing. Fix the gate or remove it.
3. When adding a gate: create `tests/acceptance/negative-controls/<id>.mjs`
   that proves the gate can fail, and add the entry to
   `tests/acceptance/gates.json` with state, owner, scope, and enforcement
   moment.
4. Run `pnpm gate:self-test` again — the new gate must appear as proven.

## How to verify
`pnpm gate:self-test` exits 0 and lists every gate as "proves the gate fails."

## Common pitfalls
- **A gate that measured nothing reported pass.** D4's selector matched zero
  elements and reported REFUTED; the legacy-visual project compared against
  freshly-created `-legacy-visual`-suffixed snapshots and reported 57/57;
  token-audit passed because `oklch(NaN ...)` isn't `rgba()`. All three are
  the same failure: green-by-absence. The self-test is the only defense.
- **Negative controls that don't run the real gate.** A static check that
  reimplements the gate's logic tests your check, not the gate. Keep negative
  controls honest.

## Owner + last verified
`Owner: design-portal` · `Last verified: 2026-09-28`