#!/usr/bin/env node
/**
 * capture-isolated-baselines — capture each of the 12 chrome components in
 * ISOLATION (via the chrome-harness) as the migration baselines.
 *
 * Component-level snapshots (react-screenshot-test / Scalar pattern): a
 * dedicated page mounts ONE component, no surrounding layout, no card text.
 * This is the precision fix for the card-crop noise that forced the 10%
 * threshold. Isolated baselines enable a strict 2% parity gate.
 *
 * Usage:
 *   node capture-isolated-baselines.mjs [--component SidebarNav]
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(new URL('.', import.meta.url)));
const OUT = join(__dirname, 'chrome-baselines-isolated');
const HARNESS = 'http://localhost:5191';

const CHROME = [
  'Topbar', 'SidebarNav', 'MobileBottomNav', 'CalmOverlay', 'CommandPalette',
  'NotificationStack', 'BottomNav', 'SectionStrip', 'Crown', 'Footer', 'SpoonDial', 'CrisisOverlay',
];

const only = process.argv.indexOf('--component');
const ONLY = only >= 0 ? process.argv[only + 1] : null;
const targets = ONLY ? CHROME.filter((c) => c === ONLY) : CHROME;

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => {
  let frames = 0;
  const orig = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => orig(() => { if (frames++ < 12) cb(performance.now()); });
  const style = document.createElement('style');
  style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}';
  document.head.appendChild(style);
});

let captured = 0;
for (const name of targets) {
  try {
    await page.goto(`${HARNESS}/?component=${name}`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    await page.waitForTimeout(1000);
    const path = join(OUT, `component-${name}.png`);
    await page.screenshot({ path });
    captured++;
    console.log(`✓ ${name} → ${path.replace(__dirname + '/', '')}`);
  } catch (e) {
    console.log(`✗ ${name}: ${e.message.slice(0, 80)}`);
  }
}
await browser.close();
console.log(`\nCaptured ${captured}/${targets.length} isolated baselines into chrome-baselines-isolated/`);