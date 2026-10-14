#!/usr/bin/env node
/**
 * console-check.mjs — H4 sweep lane: load pages and report console errors.
 * Exit 0 when zero console errors across all pages.
 */
import { chromium } from '/home/p31/node_modules/playwright/index.mjs';

const BASE = process.env.BASE || 'https://p31ca.org';
const pages = (process.env.PAGES || '/,/about/,/enterprise/,/hire/,/research/,/faq/,/get-involved/,/apps/loom/')
  .split(',').filter(Boolean);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
let totalErrors = 0;
for (const p of pages) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text().slice(0, 120));
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${String(err).slice(0, 120)}`));
  try {
    await page.goto(`${BASE}${p}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
  } catch (e) {
    errors.push(`goto: ${String(e).slice(0, 120)}`);
  }
  console.log(`${p.padEnd(22)} ${errors.length === 0 ? 'clean' : `${errors.length} errors: ${errors[0]}`}`);
  totalErrors += errors.length;
  await page.close();
}
await browser.close();
console.log(`console-check: ${totalErrors} console errors across ${pages.length} pages`);
process.exit(totalErrors === 0 ? 0 : 1);