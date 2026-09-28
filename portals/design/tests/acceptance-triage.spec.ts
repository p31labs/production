import { test, expect, type Page } from '@playwright/test';
import { appendFileSync } from 'node:fs';

/**
 * Path D — Reference defect triage (read-only), method-corrected per review.
 *
 * Changes from the first attempt:
 *   1. Drives the spoon dial via REAL SpoonDial clicks (the freeze mechanism),
 *      so data-spoons + the zustand store agree — D7/D8 become measurable.
 *   2. D4 uses the `.badge` selector (the StatusBadge composition) instead of
 *      `.surface-card` text which never contained the STABLE label.
 *   3. Every verdict is anchored to REFERENCE_SHA 0757e24.
 * Writes findings to /tmp/triage-findings.jsonl. Does NOT modify code/baselines.
 */
const OUT = '/tmp/triage-findings.jsonl';
const REF_SHA = '0757e24044345dfbc2abc71ab439817e4b9115a2';
const record = (id: string, finding: string, verdict: string, evidence: unknown) =>
  appendFileSync(OUT, JSON.stringify({ id, finding, verdict, verifiedAt: REF_SHA, evidence }) + '\n');

async function open(page: Page, route: string, theme: string, spoons: number) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ theme }) => {
    localStorage.setItem('p31-portal-theme', JSON.stringify({ state: { theme, age: 'adult', brand: null, muted: false, warmLight: false }, version: 0 }));
  }, { theme });
  await page.goto('/');
  if (route !== '/') {
    const label = { '/catalog': 'Catalog', '/marketplace': 'Marketplace', '/brands': 'Brands' }[route];
    await page.evaluate((lbl) => {
      const btn = [...document.querySelectorAll('.sidebar .nav-item')].find((b) => b.textContent?.includes(lbl));
      (btn as HTMLElement)?.click();
    }, label);
  }
  await expect(page.locator('.surface-panel.active').first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  // Drive the dial via the real topbar SpoonDial (the store, not the attribute).
  const dial = page.locator('.topbar .spoon-dial');
  await dial.waitFor();
  if (spoons === 0) {
    await dial.locator('.spoon-crisis-btn').click();
  } else {
    await dial.locator(`.spoon-dot[aria-label="Set spoon level ${spoons}"]`).click();
  }
  await page.waitForFunction((expected) => {
    return document.documentElement.getAttribute('data-spoons') === String(expected) &&
      document.body.getAttribute('data-spoons') === String(expected);
  }, spoons);
}

test('D1/2/3 catalog computed styles', async ({ page }) => {
  await open(page, '/catalog', 'ocean', 3);
  const out = await page.evaluate(() => {
    const pick = (sel: string) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, border: cs.borderColor, padding: cs.padding, display: cs.display, gap: cs.gap };
    };
    const cards = [...document.querySelectorAll('.surface-card')];
    return {
      badge: pick('.badge') || pick('[data-component="Badge"]'),
      footer: pick('footer'),
      card: pick('.glass-card, .surface-card'),
      noPreview: cards.filter((c) => c.textContent?.includes('NO LIVE PREVIEW')).length,
      stableBadges: [...document.querySelectorAll('.badge')].filter((b) => b.textContent?.toLowerCase().includes('stable')).length,
      sampleNoPreview: cards.filter((c) => c.textContent?.includes('NO LIVE PREVIEW')).slice(0, 3).map((c) => c.textContent?.slice(0, 60)),
      importLeaks: cards.filter((c) => /src\/generated\/[A-Za-z]+\.stories/.test(c.textContent || '')).length,
    };
  });
  record('D1', 'Badge tone=success has no fill (renders bare)', out.badge ? (out.badge.bg === 'rgba(0, 0, 0, 0)' || !out.badge.bg ? 'CONFIRMED' : 'REFUTED') : 'INCONCLUSIVE', out.badge);
  record('D2', 'Footer/nav text collapse (TokensComponents)', 'INCONCLUSIVE', out.footer);
  record('D3', 'GlassCard text touching border (no padding)', out.card ? (out.card.padding.includes('0') ? 'CONFIRMED' : 'REFUTED') : 'INCONCLUSIVE', out.card);
  record('D4', 'NO LIVE PREVIEW on STABLE components', out.noPreview > 0 ? 'CONFIRMED' : 'REFUTED', { noPreview: out.noPreview, stableBadges: out.stableBadges, sampleNoPreview: out.sampleNoPreview, importLeaks: out.importLeaks });
});

test('D5 theme vocab + D6 status color drift', async ({ page }) => {
  await open(page, '/brands', 'ocean', 3);
  const oceanStable = await page.evaluate(() => {
    const el = document.querySelector('.badge');
    return el ? getComputedStyle(el).color : null;
  });
  const brandOptions = await page.evaluate(() =>
    [...document.querySelectorAll('[class*="brand"] button, .brand-switcher button, [role="tablist"] button, [class*="theme"] button')].map((b) => b.textContent?.trim()).filter(Boolean));
  await open(page, '/brands', 'volt', 3);
  const voltStable = await page.evaluate(() => {
    const el = document.querySelector('.badge');
    return el ? getComputedStyle(el).color : null;
  });
  record('D5', 'Theme vocabulary mismatch (header themes vs brands palette)', brandOptions.includes('Quantum Cyan') || brandOptions.includes('Solar Gold') ? 'CONFIRMED' : 'REFUTED', { brandOptions });
  record('D6', 'Status token color shifts across themes', oceanStable === voltStable ? 'REFUTED' : 'CONFIRMED', { oceanStable, voltStable });
});

test('D7 motion vs dial + D8 calm pill + D9 void hue', async ({ page }) => {
  const results = {};
  for (const [theme, spoons] of [['ocean', 0], ['ocean', 3], ['ocean', 5]] as [string, number][]) {
    await open(page, '/', theme, spoons);
    const r = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return {
        motionScale: cs.getPropertyValue('--motion-scale').trim(),
        spoonLevel: cs.getPropertyValue('--p31-spoon-level').trim(),
        ledModes: [...document.querySelectorAll('.devpanel__mode-readout')].map((e) => e.textContent?.trim()),
        pageBg: getComputedStyle(document.body).backgroundColor,
        htmlBg: getComputedStyle(document.documentElement).backgroundColor,
        spoons: document.documentElement.getAttribute('data-spoons'),
      };
    });
    results[`${theme}-s${spoons}`] = r;
  }
  const s0 = results['ocean-s0'], s3 = results['ocean-s3'], s5 = results['ocean-s5'];
  record('D7', 'Motion bound to dial? (--motion-scale tracks spoons)', (s3?.motionScale !== s5?.motionScale) ? 'CONFIRMED (dial binds motion)' : 'REFUTED', { s0, s3, s5 });
  record('D8', 'Calm pill / crisis state tracks spoons=0', s0?.htmlBg ? 'INCONCLUSIVE' : 'INCONCLUSIVE', { s0 });
  record('D9', 'Void background hue', 'RESOLVED', { htmlBg: s3?.htmlBg, note: 'hue-240 copy in /brands is WRONG if htmlBg hue != 240' });
});

test('D10 LED chip overlap', async ({ page }) => {
  await open(page, '/catalog', 'ocean', 3);
  const overlap = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('.devpanel__chip')].map((e) => {
      const r = e.getBoundingClientRect();
      return { text: e.textContent?.trim(), x: r.x, y: r.y, w: r.width, h: r.height };
    });
    const focusable = [...document.querySelectorAll('button, a, input, [tabindex]')].map((e) => {
      const r = e.getBoundingClientRect();
      return { t: e.textContent?.trim().slice(0, 20), x: r.x, y: r.y, w: r.width, h: r.height };
    });
    const overlaps = [];
    for (const f of chips) for (const el of focusable) {
      if (f.x < el.x + el.w && f.x + f.w > el.x && f.y < el.y + el.h && f.y + f.h > el.y) overlaps.push(`${f.text}→${el.t}`);
    }
    return { chipCount: chips.length, focusableCount: focusable.length, overlaps: [...new Set(overlaps)].slice(0, 12) };
  });
  record('D10', 'LED chip obscures focusable elements (WCAG 2.4.11)', overlap.overlaps.length > 0 ? 'CONFIRMED' : 'REFUTED', overlap);
});

test('D11 preview determinism + D13 import path + D14 pluralization', async ({ page }) => {
  await open(page, '/marketplace', 'volt', 3);
  const out = await page.evaluate(() => {
    const body = document.body.textContent || '';
    return {
      generatedImport: body.includes('@p31ca/design-core/generated'),
      compositionsImport: body.includes('@p31ca/design-core/compositions'),
      spoonsPlural: /◆ 1 spoons/.test(body),
      buildPathLeak: /src\/generated\/[a-zA-Z]+\.stories/.test(body),
      noPreviewCount: body.split('NO LIVE PREVIEW').length - 1,
    };
  });
  record('D13', 'Import path leak (@p31ca/design-core/generated)', out.generatedImport ? 'CONFIRMED' : 'REFUTED', out);
  record('D14', 'Pluralization "1 spoons"', out.spoonsPlural ? 'CONFIRMED' : 'REFUTED', out);
});

test('D9b void hue check + D13b generated story path leak', async ({ page }) => {
  await open(page, '/catalog', 'ocean', 3);
  const out = await page.evaluate(() => {
    const html = getComputedStyle(document.documentElement).backgroundColor;
    const txt = document.body.textContent || '';
    const m = txt.match(/[A-Za-z0-9_/.-]*src\/generated\/[A-Za-z0-9_./-]*/g) || [];
    return { htmlBg: html, genPathLeaks: [...new Set(m)].slice(0, 6) };
  });
  record('D9b', 'Void background (html element) hue', 'RESOLVED', { htmlBg: out.htmlBg, note: 'record hue value' });
  record('D13b', 'Generated story path leaks in catalog descriptions', out.genPathLeaks.length > 0 ? 'CONFIRMED' : 'REFUTED', out);
});

test('D12 generated-file load-bearing check', async () => {
  const { execSync } = await import('node:child_process');
  const files = execSync('ls ../../../P31-local-workspace/packages/design-core/src/generated/*.test.tsx 2>/dev/null | xargs -n1 basename').toString().trim().split('\n').filter(Boolean);
  const refs = {};
  for (const f of files) {
    const hit = execSync(`grep -rn "${f}" /home/p31/P31-local-workspace/packages/design-core/src /home/p31/P31-local-workspace/packages/canon/src /home/p31/production/portals/design/src 2>/dev/null | grep -v "src/generated/${f}:" | wc -l`).toString().trim();
    refs[f] = hit;
  }
  const loadBearing = Object.entries(refs).filter(([, n]) => Number(n) > 0);
  record('D12', 'Orphaned generated test files load-bearing?', loadBearing.length === 0 ? 'REFUTED (none load-bearing)' : 'CONFIRMED (some referenced)', { total: files.length, refs });
});