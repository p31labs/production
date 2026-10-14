import { test, expect } from "@playwright/test";

/** `load` can hang on Three/WebGL; `domcontentloaded` is enough for smoke. */
const nav = { waitUntil: "domcontentloaded" as const, timeout: 90_000 };

test.describe("p31ca hub (built dist)", () => {
  test("home responds", async ({ page }) => {
    const res = await page.goto("/", nav);
    expect(res?.ok()).toBeTruthy();
  });

  test("stylebook (current canon surface) renders hub appearance", async ({ page }) => {
    // Replaces the retired /p31-canon-demo checks (2026-10-13: the canon
    // demo surface was removed from the deploy — 404 live; its archive copy
    // lives in public/archive/2025-early/p31-canon-demo.html). The stylebook
    // is the current public canon surface and carries the same
    // data-p31-appearance contract.
    const res = await page.goto("/stylebook/", nav);
    expect(res?.ok()).toBeTruthy();
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-p31-appearance", /hub|org|auto/);
    await expect(page).toHaveTitle(/P31 Stylebook/);
  });

  test("generated style sheet exposes core variables", async ({ request }) => {
    const res = await request.get("/p31-style.css");
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain("--p31-void:");
    expect(text).toContain("data-p31-appearance=\"org\"");
  });

  test("machine pack JSON is valid", async ({ request }) => {
    const res = await request.get("/p31-super-centaur-pack.json");
    expect(res.ok()).toBeTruthy();
    const j = await res.json();
    expect(j.schema).toBe("p31.superCentaurStarterPack/1.0.0");
    expect(j.meshFleet?.MESH?.cage).toContain("k4-cage");
  });

  test("initial build bake script is servable", async ({ request }) => {
    const res = await request.get("/lib/p31-initial-build-bake.js");
    expect(res.ok()).toBeTruthy();
    const t = await res.text();
    expect(t).toContain("p31.buildRecord/0.1.0");
  });

  test.skip("canon demo loads and toggles org appearance (RETIRED 2026-10-13)", async () => {
    // /p31-canon-demo was retired before this wave — 404 live. The org/hub
    // appearance toggle lived only on that surface; no successor carries it.
    // The current canon surface (/stylebook/) is asserted above.
  });

  test.skip("canon demo live tokens visible (RETIRED 2026-10-13)", async () => {
    // Same surface retirement as above; the "live tokens" readout is gone
    // with it. Filed: fix-plan p31ca-inp-lighthouse-budgets.md §e2e.
  });

  test.skip("super-centaur starter renders (RETIRED 2026-10-13)", async () => {
    // /p31-super-centaur-starter.html now 301s to /ops#centaur, and /ops
    // itself is retired (404). The starter pack JSON is still served and
    // asserted above.
  });

  test.skip("initial build page loads (CWP + bake entry) (RETIRED 2026-10-13)", async () => {
    // /initial-build.html now 301s to home; the CWP-P31-IB-2026-01 shell
    // was retired before this wave. The bake script itself is still served
    // and asserted above.
  });

  test.skip("messaging hub page and schema anchor (RETIRED 2026-10-13)", async () => {
    // /messaging-hub 404s live; /messages 301s into that dead chain. The
    // messaging hub surface was retired before this wave with no successor.
  });
});