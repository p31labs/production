#!/usr/bin/env node
/* P31-HEADER
 * id: p31_v4_interaction_state_20261011_v1.0
 * type: gate (browser-gated, RFC-0006 Design CI boundary §8.5)
 * component: design-workflow/V4-D-design-ci
 * status: live
 * retention: keep-forever
 * created: 2026-10-11T00:00:00Z
 * owner: half-sour
 */

// P31 Workstream D (v4.0) — interaction-state gate.
// Renders an HTML fixture at 320x844 via system Chromium (never downloads),
// enumerates interactive elements (a[href], button, input, select, textarea,
// [role="button"], [tabindex]) and asserts each defines, via COMPUTED STYLE
// (not CSS text): :hover, :focus-visible (keyboard modality), :active.
// `data-state-exempt` is the documented exemption. Exit 1 on any failure.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(process.argv[2] ?? join(here, 'fixtures', 'interaction-good.html'));
if (!existsSync(target)) {
  console.error(`ERROR: fixture not found: ${target}`);
  process.exit(2);
}

// probe (browser policy: never download)
const homeCache = resolve(process.env.HOME || '/home/p31', '.cache', 'ms-playwright');
let sysChromium = null;
try {
  sysChromium = execSync('command -v chromium || command -v chromium-browser || command -v google-chrome || true',
    { shell: '/bin/bash', encoding: 'utf8' }).trim();
} catch { sysChromium = null; }
if (!sysChromium && !existsSync(homeCache)) {
  console.log('SKIPPED: no browser binaries — hardware-gated');
  process.exit(0);
}

let playwright;
try { playwright = await import('playwright'); } catch (e) {
  console.log(`SKIPPED: playwright unavailable (${String(e.message).split('\n')[0]})`);
  process.exit(0);
}

const launchOpts = sysChromium
  ? { executablePath: sysChromium, headless: true }
  : { headless: true };
const browser = await playwright.chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 320, height: 844 } });
await page.goto('file://' + target);

const TRACKED = ['outline-style', 'outline-width', 'outline-color', 'box-shadow', 'background-color', 'color', 'transform', 'border-color', 'text-decoration-line'];
const snap = (el) =>
  el.evaluate((node, props) => {
    const cs = getComputedStyle(node);
    const o = {};
    for (const p of props) o[p] = cs.getPropertyValue(p);
    return o;
  }, TRACKED);
const differs = (a, b) => TRACKED.some((p) => a[p] !== b[p]);

const sel = ['a[href]', 'button', 'input', 'select', 'textarea', '[role="button"]', '[tabindex]'].join(',');
const els = await page.$$(sel);
console.log(`target: ${target}`);
console.log(`interactive elements: ${els.length}`);

if (els.length === 0) {
  console.log('NOTE: 0 interactive elements — interaction-state check is vacuously satisfied');
  console.log('RESULT: PASS (vacuous)');
  await browser.close();
  process.exit(0);
}

let failures = 0;
for (const el of els) {
  const info = await el.evaluate((node) => ({
    tag: node.tagName.toLowerCase(),
    text: (node.textContent ?? '').trim().slice(0, 24),
    exempt: node.hasAttribute('data-state-exempt'),
    box: node.getBoundingClientRect().toJSON(),
  }));
  const label = `<${info.tag}> "${info.text}"`;
  const b = await snap(el);
  const missing = [];

  // :hover (settle CSS transitions before snapshotting)
  try { await el.hover(); } catch {}
  await page.waitForTimeout(250);
  const h = await snap(el);
  if (!differs(b, h)) missing.push(':hover');
  await page.mouse.move(0, 0);

  // :focus-visible (keyboard modality via Tab)
  await page.mouse.click(0, 0);
  let focused = false;
  for (let i = 0; i < 24 && !focused; i++) {
    await page.keyboard.press('Tab');
    focused = await page.evaluate((n) => document.activeElement === n, el);
  }
  let f = null;
  if (focused) f = await snap(el);
  if (!focused || !differs(b, f)) missing.push(':focus-visible');

  // :active (mouse down)
  const center = await el.evaluate((node) => {
    const r = node.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  const a = await snap(el);
  await page.mouse.up();
  if (!differs(b, a)) missing.push(':active');

  if (missing.length && !info.exempt) {
    failures++;
    console.log(`  [FAIL] ${label} — missing state styles: ${missing.join(', ')}`);
  } else if (missing.length && info.exempt) {
    console.log(`  [OK/exempt] ${label} — missing ${missing.join(', ')} (data-state-exempt)`);
  } else {
    console.log(`  [PASS] ${label}`);
  }
}

await browser.close();
console.log(`RESULT: ${failures === 0 ? 'PASS' : `FAIL — ${failures} element(s) missing interaction states`}`);
process.exit(failures === 0 ? 0 : 1);