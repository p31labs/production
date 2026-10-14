import { test, expect } from "@playwright/test";

/**
 * Production smoke for the "$5 stack" wave surfaces:
 * /sovereign-vs-saas, /verify, /runbook, /research papers.
 *
 * Prod-gated like prod-smoke.spec.ts — runs only when
 * PLAYWRIGHT_BASE_URL points at p31ca.org:
 *   PLAYWRIGHT_BASE_URL=https://p31ca.org PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test e2e/five-dollar-stack.spec.ts
 */
const prod = process.env.PLAYWRIGHT_BASE_URL?.includes("p31ca.org");

const nav = { waitUntil: "domcontentloaded" as const, timeout: 90_000 };

/** Console-clean sniffing per the spike-appshell-field pattern (no comment leak, no JS errors). */
function attachConsoleSniffer(page: import("@playwright/test").Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));
  const ALLOWED: RegExp[] = [/WebGL context lost/i, /SwiftShader/i, /preserveDrawingBuffer/i, /\[Violation\]/i];
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

test.describe("five-dollar-stack surfaces (production)", () => {
  test.skip(!prod, "set PLAYWRIGHT_BASE_URL to p31ca.org to enable");

  test("/sovereign-vs-saas renders the comparison table with sources", async ({ page }) => {
    const sniff = attachConsoleSniffer(page);
    const res = await page.goto("/sovereign-vs-saas/", nav);
    expect(res?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { level: 1, name: /Sovereign vs SaaS/i })).toBeVisible();
    await expect(page.getByText("Mintive (MintMCP) Teams")).toBeVisible();
    await expect(page.getByText("LangSmith Plus")).toBeVisible();
    await expect(page.getByText("Vercel Pro")).toBeVisible();
    await expect(page.getByText(/AWS S3/i)).toBeVisible();
    await expect(page.getByText("We don't sell this page. We run on it.")).toBeVisible();
    sniff.assertClean();
  });

  test("/verify shows the live Loom verdict and replays the chain in-browser", async ({ page }) => {
    const sniff = attachConsoleSniffer(page);
    const res = await page.goto("/verify/", nav);
    expect(res?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { level: 1, name: /Verify the Loom/i })).toBeVisible();
    await expect(page.locator("#loom-status")).toContainText(/Chain verified|reach the ledger|broken/, { timeout: 20_000 });
    const checked = await page.locator("#loom-checked").textContent();
    expect(checked ?? "").toContain("records");
    const head = await page.locator("#loom-head").textContent();
    expect(head ?? "").not.toBe("—");
    await page.getByRole("button", { name: "Verify now" }).click();
    await expect(page.locator("#verify-result")).toContainText(/Verified in your browser|redacted|replayed|broken|reach the ledger/, { timeout: 30_000 });
    sniff.assertClean();
  });

  test("/runbook renders the allowance table", async ({ page }) => {
    const sniff = attachConsoleSniffer(page);
    const res = await page.goto("/runbook/", nav);
    expect(res?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { level: 1, name: /\$5 stack runbook/i })).toBeVisible();
    await expect(page.getByText("25B rows read/mo")).toBeVisible();
    await expect(page.getByText("10,000 neurons/day free")).toBeVisible();
    await expect(page.getByText("+$0.30 per 1M requests")).toBeVisible();
    sniff.assertClean();
  });

  test("/research links the Papers-on-Pages PDFs", async ({ page }) => {
    const sniff = attachConsoleSniffer(page);
    const res = await page.goto("/research/", nav);
    expect(res?.ok()).toBeTruthy();
    await expect(page.getByText("Papers on Pages")).toBeVisible();
    await expect(page.locator('a[href="/papers/sovereign-stack-paper-xii-v2.pdf"]')).toBeVisible();
    await expect(page.locator('a[href="/papers/consciousness-memory-architecture.pdf"]')).toBeVisible();
    sniff.assertClean();
  });

  test("nav atoms render Compare (immersion) and Verify (action)", async ({ page }) => {
    await page.goto("/", nav);
    await page.getByRole("button", { name: /Immersion/ }).click();
    await expect(page.getByRole("link", { name: "Compare" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /Action/ }).click();
    await expect(page.getByRole("link", { name: "Verify" })).toBeVisible();
  });
});