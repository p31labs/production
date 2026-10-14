import { test, expect } from "@playwright/test";

/**
 * Optional: PLAYWRIGHT_BASE_URL=https://p31ca.org PLAYWRIGHT_SKIP_WEBSERVER=1 npm run test:e2e
 * (run after deploy or against production manually)
 */
const prod = process.env.PLAYWRIGHT_BASE_URL?.includes("p31ca.org");

const nav = { waitUntil: "domcontentloaded" as const, timeout: 90_000 };

test.describe("production smoke (optional)", () => {
  test.skip(!prod, "set PLAYWRIGHT_BASE_URL to p31ca.org to enable");

  test("Initial Build short URL /build resolves to home (2026-10-13 behavior)", async ({ page }) => {
    // /build now 301s to home — the Initial Build shell (CWP-P31-IB-2026-01)
    // was retired before this wave. The short URL itself is still a live
    // route; assert what it actually serves.
    const res = await page.goto("/build", nav);
    expect(res?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { level: 1, name: /Ownable Tech Stack/i })).toBeVisible({ timeout: 20_000 });
  });

  test("initial-build bake script served from edge", async ({ request }) => {
    const res = await request.get("/lib/p31-initial-build-bake.js");
    expect(res.ok()).toBeTruthy();
    const t = await res.text();
    expect(t).toContain("p31.buildRecord/0.1.0");
  });

  test.skip("canon demo live (RETIRED 2026-10-13)", async () => {
    // /p31-canon-demo.html was retired before this wave — 404 live. The
    // current canon surface (/stylebook/) is covered by hub-smoke.
  });

  test.skip("Delta hiring short /hiring resolves and SPA shell renders (RETIRED 2026-10-13)", async () => {
    // The Delta hiring SPA was retired (public/delta-hiring/index.html
    // removed before this wave). /hiring 301s to /ops, and /ops itself 404s.
  });

  test.skip("messaging hub short /messages resolves (RETIRED 2026-10-13)", async () => {
    // /messages 301s to /messaging-hub, which 404s live — the messaging hub
    // surface was retired before this wave with no successor.
  });
});