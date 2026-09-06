/**
 * Visual acceptance harness — full-page captures at the breakpoint matrix.
 * Usage: pnpm build && pnpm exec vite preview --port 4173 & then
 *        pnpm exec tsx e2e/visual-capture.mts [baseURL]
 * Output: shots/<viewport>-spoons<n>.png
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:4173';
const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];
const SPOONS = ['3', '0'];

mkdirSync('shots', { recursive: true });

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  for (const spoons of SPOONS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate((s) => document.documentElement.setAttribute('data-spoons', s), spoons);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `shots/${vp.name}-spoons${spoons}.png`, fullPage: true });
    console.log(`✓ ${vp.name} spoons=${spoons}`);
    await ctx.close();
  }
}
await browser.close();
console.log(`done → ${VIEWPORTS.length * SPOONS.length} captures in ./shots`);
