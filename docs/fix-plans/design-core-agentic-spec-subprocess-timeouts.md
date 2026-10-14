<!-- P31-HEADER
id: p31_fix_plan_design_core_agentic_spec_subprocess_timeouts_20261012_v1.0
type: fix-plan
component: packages/design-core
status: open
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

# fix-plan: design-core agentic specs time out under disk pressure (escalation)

**Discovered by:** agent:subagent:canon-v2 (H1 header-height + centering leg,
verification battery)
**Discovered at:** 2026-10-12T00:00:00Z
**Severity:** low (pre-existing flakes, documented; environment-sensitive)

## The observation

The H1 leg's design-core `vitest run` verification surfaced an escalation of
the flake already tracked in
`docs/fix-plans/design-core-react19-server-render-test-failures.md` ("Flake
note (also pre-existing)"):

- `tests/agentic/negative-control.spec.ts` — `design audit --nc exits 0`
  → `Test timed out in 5000ms`.
- `tests/agentic/human-anchor.spec.ts` — `refuses to approve without --by`
  and `approves with the reviewer pickle name recorded` → `Test timed out in
  5000ms` (sibling tests in the same spec passed at 4.4–5.0 s — right at the
  wire).

The prior fix-plan said these specs "always [passed] in isolation"; they now
fail in isolation too. All three failures are vitest's 5000 ms test timeout,
not assertion failures: each test spawns `pnpm exec tsx src/agentic/cli.ts`
via `execSync`, and cold-start on this machine (STATE.md: disk at 97%) now
regularly exceeds 5 s.

## Why it is not the H1 diff

The H1 leg touched `packages/canon/src/theming/theme-store.ts` (one additive
BASE token), `packages/canon/scripts/gen-tokens.mjs` (one `typeFor` case),
`packages/design-core/src/css/canon-v2.css` (one `html` scroll-padding
rule), `scripts/render-gate.mjs`, and docs. `src/agentic/cli.ts` imports
only `intent/parser`, `qa/gates`, `orchestrate`, `audit`, `approve` — none
of which depend on the token pipeline or the CSS. Subprocess spawn latency
is the failing variable; the canon-v2 spec itself is green
(`tests/canon-v2.spec.tsx` — 18/18).

## What to do (owner)

1. Bump `testTimeout` for the agentic specs (or pass per-test timeouts) —
   5 s is too tight for `pnpm exec tsx` cold starts on a loaded disk.
2. Or drive the CLI through a shared in-process harness instead of
   `execSync` per test (the subprocesses are the documented slowness).
3. The disk-pressure root cause (STATE.md open loop: disk below 90%) makes
   this flake worse until resolved.

## Verification

- `npx vitest run tests/canon-v2.spec.tsx` → 18/18 green (H1 surface).
- Full-suite failures are confined to the two agentic specs above, all
  `Test timed out in 5000ms`.