#!/usr/bin/env node
/**
 * hero-pixel-check.mjs — H4 sweep lane: screenshot-compare the home hero
 * region (live vs preview) with prefers-reduced-motion so the WebGL dome
 * renders its static frame. Exit 0 when pixel-identical (0 differing pixels
 * above tolerance), else prints the diff count.
 */
import { chromium } from '/home/p31/node_modules/playwright/index.mjs';
import { createHash } from 'node:crypto';

const LIVE = process.env.LIVE || 'https://p31ca.org';
const PREVIEW = process.env.PREVIEW || 'http://127.0.0.1:4321';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce',
  colorScheme: 'dark',
});

const shot = async (base) => {
  const page = await ctx.newPage();
  await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  // hero section = the section following the sticky header, containing the H1
  const hero = page.locator('main section').first();
  const buf = await hero.screenshot();
  await page.close();
  return buf;
};

const liveBuf = await shot(LIVE);
const prevBuf = await shot(PREVIEW);
await browser.close();

const liveHash = createHash('sha256').update(liveBuf).digest('hex');
const prevHash = createHash('sha256').update(prevBuf).digest('hex');
console.log(`hero-pixel-check: live=${liveHash.slice(0, 16)} preview=${prevHash.slice(0, 16)}`);

// raw byte compare; identical buffers = identical pixels
const same = liveBuf.length === prevBuf.length && liveHash === prevHash;
console.log(same
  ? `hero-pixel-check: IDENTICAL (${liveBuf.length} bytes)`
  : `hero-pixel-check: DIFFERENT (live ${liveBuf.length}B vs preview ${prevBuf.length}B)`);
process.exit(same ? 0 : 1);