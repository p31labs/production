<!-- P31-HEADER
id: p31ca_vitest_fake_indexeddb_20261014_v1.0
type: fix-plan
component: apps/p31ca
status: open
retention: keep-forever
created: 2026-10-14T00:00:00Z
owner: will
-->

# fix-plan: p31ca vitest cannot run — fake-indexeddb never installed

**Discovered by:** agent (content-width/underline/menu wave, 2026-10-14 —
portalRouter test modified this session could not be executed)
**Discovered at:** 2026-10-14
**Severity:** high (the arc discipline "every change is verified by
execution" is broken — build passes, but no test suite can run at all)
**Status: RESOLVED 2026-10-14** — see ## Resolution below.

## Symptom

`npx vitest run src/lib/portalRouter` fails at module resolution **before any
test executes**:

```
Cannot find module "fake-indexeddb" — imported by vitest.setup.ts:1
```

`vitest.setup.ts` imports `{ indexedDB } from 'fake-indexeddb'` and installs
it on `globalThis`. The package is:

- **not** in `apps/p31ca/package.json` devDependencies
- **not** in the workspace root `package.json`
- **not** in `pnpm-lock.yaml` (0 hits — never was a dependency)
- **not** in any `node_modules/.pnpm` store entry

So every `pnpm --filter p31ca exec vitest run …` dies in the setup phase.
The 5 existing test suites (`src/lib/**/__tests__/**`, components, arcade-core,
phos-v2, passport) are all gated behind this broken setup file.

**Not caused by the 2026-10-14 wave** — the setup file is untouched by it
(git clean), but the portalRouter test edited this session (`tetra` removal,
6→5 destinations) could only be verified by inspection, not execution.

## The fix

1. Add `fake-indexeddb` to `apps/p31ca` devDependencies:
   ```bash
   cd apps/p31ca && pnpm add -D fake-indexeddb
   ```
   (or hoist to the workspace root if other packages share the setup — check
   for other `fake-indexeddb` importers first; `grep -rn fake-indexeddb --include="*.ts*" packages/ portals/ apps/`).
2. Confirm the existing `vitest.setup.ts` resolves and the suite runs:
   ```bash
   pnpm --filter p31ca exec vitest run src/lib/portalRouter
   ```
3. Then run the full suite once to confirm no other latent breaks hide behind
   the setup failure:
   ```bash
   pnpm --filter p31ca exec vitest run
   ```
4. If any suite that previously "passed" on CI surfaces a real regression
   now that setup actually works, file a follow-up plan — do not silently
   mark the suite red.

## Rollback

None needed — this restores intended behavior (tests should run). The risk is
purely additive: a new devDependency + the first real test run in this
workspace.

## Resolution (2026-10-14)

- `fake-indexeddb@^3.1.8` added to `apps/p31ca` devDependencies; `pnpm
  install --filter p31ca` (the package was never a dependency anywhere —
  `pnpm-lock.yaml` had 0 hits; only `software/package.json` declared it).
- `npx vitest run` now executes: **15 test files, 85 tests, all passing**.
- The session's `portalRouter.test.ts` (6→5 destinations, Tetra removal) is
  now verified by execution, not just inspection.
- One latent break surfaced once the suite could run: `ledStore.test.ts`
  asserted `LED_MODES).toHaveLength(7)` but the store has 8 modes (all 8
  labeled, `sigh` present since the store was first tracked) — the test was
  stale, never executed. Corrected to 8. No store regression.
- If a future suite change breaks under the now-working setup, file a new
  follow-up plan rather than marking the suite red.

## Related

- `apps/p31ca/docs/fix-plans/p31ca-astro-v6-upgrade.md` — Astro v6 moved tests
  to `src/` vitest; the setup-file gap predates and survived that upgrade.
- `docs/fix-plans/p31ca-canon-v2-adopt-page-shell-2026-10-14.md` — the other
  plan filed by the same wave (sweep-rule debt on the 7 narrowed pages).