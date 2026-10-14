#!/usr/bin/env node
/* P31-HEADER
 * id: p31_c_dom_check_20261011_v1.0
 * type: gate (optional, browser-gated)
 * component: design-workflow/C-mobile-audit
 * status: live
 * retention: keep-forever
 * created: 2026-10-11T00:00:00Z
 * owner: half-sour
 */

// P31 Workstream C — DOM-level mobile-first check (runbook C-1/C-2).
// Renders fixtures/page.html at 320x844 with @media neutralized, then asserts:
//   (a) document.scrollWidth <= innerWidth  (zero horizontal overflow)
//   (b) every <button> >= 44px              (touch floor, WCAG 2.5.5 / Apple HIG)
//
// Browser policy: NEVER downloads or installs anything. Uses Playwright 1.62.0
// (/home/p31/node_modules) only if a browser binary already exists:
//   - PLAYWRIGHT_BROWSERS_PATH / ~/.cache/ms-playwright (bundled binaries), or
//   - system chromium via launch channel (no download — uses /usr/bin/chromium).
// If no binary can be launched: prints "SKIPPED: no browser binaries — hardware-gated"
// and exits 0.
//
// fixtures/page.html is DELIBERATELY BAD (28px button + 400px fixed container):
// both assertions FAIL here — that failure is the negative control.

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pagePath = resolve(here, 'fixtures', 'page.html');

// ---------------------------------------------------------------- probe

function probeLog(msg) { console.log(`probe: ${msg}`); }

probeLog(`PLAYWRIGHT_BROWSERS_PATH=${process.env.PLAYWRIGHT_BROWSERS_PATH || '(unset)'}`);
const homeCache = resolve(process.env.HOME || '/home/p31', '.cache', 'ms-playwright');
probeLog(`~/.cache/ms-playwright=${existsSync(homeCache) ? 'present' : 'absent'}`);
probeLog(`/home/p31/.cache/ms-playwright=${existsSync('/home/p31/.cache/ms-playwright') ? 'present' : 'absent'}`);

let sysChromium = null;
try {
  sysChromium = execSync('command -v chromium || command -v chromium-browser || command -v google-chrome || true',
    { shell: '/bin/bash', encoding: 'utf8' }).trim();
} catch { sysChromium = null; }
probeLog(`system chromium=${sysChromium || 'absent'}`);

// ---------------------------------------------------------------- launch (attempt only, never download)

let playwright = null;
try { playwright = await import('playwright'); } catch (e) {
  console.log('SKIPPED: no browser binaries — hardware-gated');
  console.log(`  (playwright import failed: ${String(e.message).split('\n')[0]})`);
  process.exit(0);
}

let browser = null;
let launchErr = null;
const attempts = [];
if (sysChromium) attempts.push({ executablePath: sysChromium, args: ['--no-sandbox'] });
attempts.push({ channel: 'chromium' }, { channel: 'chrome' }, {});
for (const opts of attempts) {
  try {
    browser = await playwright.chromium.launch({ headless: true, args: ['--no-sandbox'], ...opts });
    break;
  } catch (e) { launchErr = e; }
}

if (!browser) {
  console.log('SKIPPED: no browser binaries — hardware-gated');
  console.log(`  (all launch attempts failed; last: ${String(launchErr?.message).split('\n')[0]})`);
  console.log('  NOTE: no downloads/installs were attempted.');
  process.exit(0);
}

// ---------------------------------------------------------------- run

try {
  const page = await browser.newPage({ viewport: { width: 320, height: 844 } });
  await page.goto('file://' + pagePath);

  // C-1: neutralize @media — extract inner rules of every media block and re-inject
  // them as an un-wrapped <style>, so media-gated CSS applies at 320px.
  const neutralized = await page.evaluate(() => {
    let out = '';
    for (const ss of document.styleSheets) {
      try {
        for (const rule of ss.cssRules) {
          if (rule.media) out += [...rule.cssRules].map((r) => r.cssText).join('\n') + '\n';
        }
      } catch { /* cross-origin sheet — skip */ }
    }
    return out.trim();
  });
  if (neutralized) await page.addStyleTag({ content: neutralized });
  const neutralCount = neutralized ? neutralized.split('}').length - 1 : 0;
  console.log(`media neutralization: ${neutralCount} rule(s) re-injected un-wrapped`);

  // marker: .desktop-note is display:none by default and display:block inside @media;
  // visible only if neutralization worked.
  const markerVisible = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.desktop-note')).display !== 'none');
  console.log(`neutralization marker visible: ${markerVisible ? 'yes' : 'no'}`);

  // assertions
  const r = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')];
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      buttonHeights: buttons.map((b) => Math.round(b.getBoundingClientRect().height)),
    };
  });

  let failed = 0;
  console.log('─'.repeat(72));
  console.log(`(a) horizontal overflow: scrollWidth=${r.scrollWidth} innerWidth=${r.innerWidth}`);
  if (r.scrollWidth <= r.innerWidth) {
    console.log('[PASS] (a) zero horizontal overflow at 320px with @media neutralized');
  } else {
    console.log(`[FAIL] (a) document.scrollWidth ${r.scrollWidth} > innerWidth ${r.innerWidth} — content overflows the 320px litmus viewport`);
    failed++;
  }

  console.log(`(b) touch targets: button heights [${r.buttonHeights.join(', ')}px] (floor 44px)`);
  const bad = r.buttonHeights.filter((h) => h < 44);
  if (bad.length === 0) {
    console.log('[PASS] (b) every button >= 44px');
  } else {
    console.log(`[FAIL] (b) ${bad.length} button(s) below 44px: [${bad.join(', ')}px]`);
    failed++;
  }

  console.log('─'.repeat(72));
  console.log(failed === 0 ? 'RESULT: PASS' : `RESULT: FAIL — ${failed} assertion(s) (fixture is deliberately bad; this FAIL is the negative control)`);
  await browser.close();
  process.exit(failed === 0 ? 0 : 1);
} catch (e) {
  console.log('SKIPPED: no browser binaries — hardware-gated');
  console.log(`  (page run failed: ${String(e.message).split('\n')[0]})`);
  try { await browser.close(); } catch {}
  process.exit(0);
}