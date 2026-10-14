// @ts-nocheck — measurement harness only; imports an .mjs module that is not
// part of the app's type surface. Playwright transpiles this file at runtime;
// the repo's typecheck is not the consumer of this spec.
import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
import * as inp from "../scripts/measure-inp.mjs";

/**
 * INP measurement harness — LAB PROXY ONLY. No assertions on latency.
 *
 * Measures per-surface interaction latency (p75 across N runs) for the hub
 * chrome and the marketplace playground against the LIVE sites. Verdicts are
 * reported, not enforced: real INP is a field metric (CrUX / web-vitals RUM);
 * this harness is a headless-desktop approximation (see scripts/measure-inp.mjs
 * honesty rails).
 *
 * Run like the other prod specs:
 *   PLAYWRIGHT_BASE_URL=https://p31ca.org PLAYWRIGHT_SKIP_WEBSERVER=1 \
 *     npx playwright test e2e/inp-harness.spec.ts
 */
const prod = process.env.PLAYWRIGHT_BASE_URL?.includes("p31ca.org");

const nav = { waitUntil: "domcontentloaded" as const, timeout: 90_000 };

/** Console-clean sniffer per the five-dollar-stack pattern. */
function attachConsoleSniffer(page: import("@playwright/test").Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));
  const ALLOWED: RegExp[] = [
    /WebGL context lost/i,
    /SwiftShader/i,
    /preserveDrawingBuffer/i,
    /\[Violation\]/i,
    // Third-party marketplace surface (cross-origin, measurement-only): its
    // playground fetches its own backend from the lab host; resource-level
    // network noise there is not a hub regression.
    /Failed to load resource/i,
    /ERR_CONNECTION_REFUSED/i,
  ];
  return {
    assertClean() {
      expect(
        consoleErrors.filter((e) => !ALLOWED.some((p) => p.test(e))),
        "No JS console errors"
      ).toEqual([]);
      expect(
        pageErrors.filter((e) => !ALLOWED.some((p) => p.test(e))),
        "No uncaught page errors"
      ).toEqual([]);
    },
  };
}

test.describe("INP lab-proxy harness (production)", () => {
  test.skip(!prod, "set PLAYWRIGHT_BASE_URL to p31ca.org to enable");

  test("measures hub chrome + marketplace playground interactions", async ({ page }) => {
    test.setTimeout(900_000);
    const sniff = attachConsoleSniffer(page);

    await inp.injectCollector(page);
    await page.goto(inp.HUB_URL, nav);

    // Sanity: the collector is registered before the harness proceeds.
    const present = await page.evaluate(() => typeof window.__p31Inp?.begin === "function");
    expect(present, "collector registered").toBeTruthy();

    const report = await inp.runAll(page, {
      log: (line: string) => console.log(`[inp] ${line}`),
    });

    console.log(inp.formatReport(report));

    // Persist the raw report for post-run analysis (scratch space, not the repo).
    try {
      writeFileSync(
        process.env.P31_INP_REPORT_OUT || "/tmp/opencode/p31ca-inp-report.json",
        JSON.stringify(report, null, 2)
      );
    } catch (e) {
      console.log(`[inp] report write skipped: ${String((e as Error).message).slice(0, 120)}`);
    }

    // Every HUB surface must have produced at least one measurement window —
    // otherwise the harness itself is broken (not the page). The marketplace
    // portal is cross-origin and network-dependent: an unavailable surface is
    // reported, not failed.
    for (const s of report.surfaces) {
      if (s.surface.startsWith("hub:")) {
        expect(
          s.runs,
          `${s.surface} ran at least one measurement window`
        ).toBeGreaterThan(0);
      }
    }

    sniff.assertClean();
  });
});