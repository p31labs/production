import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const baseline = JSON.parse(readFileSync(new URL('./a11y-ibm-baseline.json', import.meta.url), 'utf-8'));

test.describe.configure({ mode: 'serial', timeout: 60_000 });

// e2e/a11y-ibm.spec.ts — IBM Equal Access second engine (second opinion).
// Runs against the production build (dist/, served by pnpm preview on port 4173).
// Dist/ is used instead of dev server because IBM's deep DOM analysis
// is non-deterministic on the Vite dev server (CSS-injection artifacts,
// partial scans). Dist/ provides a stable, reproducible target.
// Both a11y.spec.ts and this spec share the same target (dist/).
//
// This spec DOES FAIL on diff from baseline (a11y-ibm-baseline.json).
// Each route's total finding count must not exceed its baseline.
// New findings are logged with rule IDs for team review:
//   - "accepted" findings are noted (known false positives or acceptable)
//   - "needs-fix" findings require correction and baseline update
// Baseline entries are curated per rule: each is dispositioned as
// accepted (with reasoning) or needs-fix (with reasoning).
// Partial scans (total < 50% of baseline) also fail — these indicate
// IBM engine errors, not real improvements.

const DIST = 'http://localhost:4173';

const ROUTES = [
  { hash: '#/entry', name: 'entry' },
  { hash: '#/street', name: 'street' },
  { hash: '#/talk', name: 'talk' },
  { hash: '#/you', name: 'you' },
  { hash: '#/switch', name: 'switch' },
  { hash: '#/craft', name: 'craft' },
  { hash: '#/workshop', name: 'workshop' },
  { hash: '#/site', name: 'site' },
  { hash: '#/worker', name: 'worker' },
];

for (const route of ROUTES) {
  test(`a11y-ibm: ${route.name}`, async ({ page }) => {
    await page.goto(DIST + route.hash);
    await page.waitForLoadState('networkidle');
    const aChecker = await import('accessibility-checker') as any;
    const results = await aChecker.getCompliance(page, route.name);
    aChecker.close();
    const all = (results.report.results || []).filter(
      (r: { path: { dom: string } }) => !r.path?.dom?.includes('/style[')
    );
    const byRule: Record<string, number> = {};
    for (const r of all) {
      const rule = (r as { ruleId?: string }).ruleId || 'unknown';
      byRule[rule] = (byRule[rule] || 0) + 1;
    }
    const prev = baseline[route.name] as { total: number; rules: Record<string, { count: number; status: string; reason: string }> } | undefined;
    const diff: Record<string, { before: number; after: number; delta: number }> = {};
    let failures = 0;
    if (prev) {
      if (all.length < prev.total * 0.5) {
        failures += prev.total;
        console.log(`[IBM ${route.name}] PARTIAL SCAN: got ${all.length}, expected ${prev.total}`);
      } else {
        const allRules = new Set([...Object.keys(prev.rules), ...Object.keys(byRule)]);
        for (const rule of allRules) {
          const before = prev.rules[rule]?.count || 0;
          const after = byRule[rule] || 0;
          const delta = after - before;
          if (delta > 0) {
            diff[rule] = { before, after, delta };
            failures += delta;
          }
        }
      }
    }
    const line = `[IBM ${route.name}] total=${all.length} (baseline=${prev?.total ?? 'NEW'}) rules=${JSON.stringify(byRule)}`;
    if (Object.keys(diff).length > 0) {
      console.log(`${line} — NEW FINDINGS: ${JSON.stringify(diff)}`);
    } else if (prev) {
      console.log(`${line} — OK (no new findings)`);
    }
    expect(failures, `IBM ${route.name}: ${failures > 0 ? 'partial scan or new findings' : 'no new findings'}`).toBe(0);
  });
}
