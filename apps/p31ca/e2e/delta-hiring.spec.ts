import { test } from "@playwright/test";

/**
 * delta-hiring.spec.ts — RETIRED 2026-10-13.
 *
 * The Delta hiring SPA was retired before this wave: its entry
 * (public/delta-hiring/index.html) was removed — only the built assets
 * remain on disk per the no-delete rule — and /delta-hiring 404s live.
 * The /hiring short URL now 301s to /ops, which is itself retired (404).
 * No successor surface exists. Filed in
 * docs/fix-plans/p31ca-inp-lighthouse-budgets.md §e2e (stale-spec sweep).
 */
test.describe.skip("P31 Delta hiring (RETIRED 2026-10-13)", () => {
  test("placeholder — see retirement note above", () => {});
});