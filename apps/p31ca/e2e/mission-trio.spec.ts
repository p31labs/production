import { test } from "@playwright/test";

/**
 * mission-trio.spec.ts — RETIRED 2026-10-13.
 *
 * Every surface this spec asserted was retired before the perf+hygiene wave:
 *   - src/data/p31-mission-trio.json was deleted (the import below crashed
 *     the file at load, breaking the suite run);
 *   - /connect.html, /delta.html, /planetary-onboard.html, /mesh-start.html,
 *     /initial-build.html, /demo-labs.html, /p31-super-centaur-starter.html,
 *     /geodesic.html all 301 into retired surfaces (/ops, /dome, /mesh, …)
 *     that 404 live.
 * The mission-trio EBC rail no longer exists in the Astro hub. Filed in
 * docs/fix-plans/p31ca-inp-lighthouse-budgets.md §e2e (stale-spec sweep).
 * No-delete rule: the file stays, marked skipped, as the honest record.
 */
test.describe.skip("mission trio (RETIRED 2026-10-13)", () => {
  test("placeholder — see retirement note above", () => {});
});