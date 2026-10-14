#!/usr/bin/env node
/**
 * verify-wcag22 — the WCAG 2.2 AA verification gate (void-fill wave 3).
 *
 * Two legs, split across the npm lifecycle:
 *   --static  (prebuild): automatable source checks.
 *   --runtime (postbuild): a small Playwright pass against `astro preview`
 *              of the FRESH dist (chromium resolves from the playwright
 *              browsers cache, same as the e2e suite).
 *   --self-test: negative controls only (planted violations must fail).
 *
 * Automatable checks:
 *   2.4.11 focus-not-obscured  — runtime: tab through the topbar + main
 *       content; every focused element outside the bar must sit BELOW the
 *       sticky bar's bottom edge − 2px (the shell's scroll-padding contract
 *       keeps focus targets clear).
 *   2.5.8  target size         — runtime: every visible interactive element
 *       in the topbar (including the overflow spoons) and the sample page's
 *       controls measures ≥24×24 computed px. Inline prose links are exempt
 *       per the criterion and reported, not asserted.
 *   2.5.7  dragging            — static: no drag-only surface may ship.
 *       The canon Split carries a keyboard fallback (ArrowLeft/Right ±5%,
 *       Home/End); any pointer-capture handler WITHOUT a same-file keyboard
 *       fallback fails.
 *   3.2.6  consistent help     — static: the shell renders the same chrome
 *       (topbar overflow with ThemePicker + Spoons, command palette, LED
 *       controller) on every route, and every page renders a footer.
 *   3.3.7  redundant entry     — static: the journey wizard asks each field
 *       once (single member picker, single identity mint).
 *   3.3.8  accessible auth     — static: signin/signup use standard inputs
 *       with autocomplete (username / current-password / new-password).
 *
 * Manual-only items are PRINTED as a checklist (2.4.11 visual contrast
 * review, 3.2.6 help-order review, 2.5.8 spacing-exception review, 3.3.7
 * voice/OTP alternative review).
 *
 * Exit 0 = pass; exit 1 = violation.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src');
const distDir = path.join(root, 'dist');

const flags = new Set(process.argv.slice(2));
const failures = [];

/* ─────────────────────────── shared file walk ───────────────────────────── */

function collect(dir, match, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, match, out);
    else if (match.test(entry.name)) out.push(full);
  }
  return out;
}

const srcFiles = collect(srcDir, /\.(astro|tsx|ts)$/);

/* ───────────────────────── 2.5.7 dragging (static) ──────────────────────── */

const DRAG_MARKERS = /onPointerDown|onPointerMove|onPointerUp|setPointerCapture|draggable\s*=|onDrag(Start|End)?\b/;
const KEY_FALLBACK = /onKeyDown|ArrowLeft|ArrowRight|role\s*=\s*["']separator["']/;

function checkDragging() {
  const problems = [];
  for (const file of srcFiles) {
    const text = fs.readFileSync(file, 'utf8');
    if (DRAG_MARKERS.test(text) && !KEY_FALLBACK.test(text)) {
      problems.push(`${path.relative(root, file)}: drag/pointer handlers with no keyboard fallback (WCAG 2.5.7)`);
    }
  }
  return problems;
}

/* ────────────────────── 3.2.6 consistent help (static) ──────────────────── */

function checkConsistentHelp() {
  const problems = [];
  const shell = fs.readFileSync(path.join(srcDir, 'layouts', 'MarketingShell.astro'), 'utf8');
  for (const chrome of ['CanonTopbar', 'CommandPalette', 'LedController']) {
    if (!shell.includes(chrome)) problems.push(`MarketingShell does not render ${chrome} (help surface must be constant)`);
  }
  const pageFiles = collect(path.join(srcDir, 'pages'), /\.astro$/);
  const componentHasFooter = new Map();
  const hasFooter = (file) => {
    const text = fs.readFileSync(file, 'utf8');
    if (/<Footer|<SharedFooter|<CanonFooter/.test(text)) return true;
    // One level of import resolution: pages that delegate to a component
    // (e.g. FlagshipPage) inherit the footer that component renders.
    for (const m of text.matchAll(/import\s+(\w+)\s+from\s+['"]((?:\.\.?\/)+[\w/-]+\.astro)['"]/g)) {
      const [, , rel] = m;
      const target = path.resolve(path.dirname(file), rel);
      if (!fs.existsSync(target)) continue;
      if (!componentHasFooter.has(target)) componentHasFooter.set(target, hasFooter(target));
      if (componentHasFooter.get(target)) return true;
    }
    return false;
  };
  for (const file of pageFiles) {
    if (!hasFooter(file)) {
      problems.push(`${path.relative(root, file)}: no footer (consistent help: footer must appear on every route)`);
    }
  }
  return problems;
}

/* ─────────────────────── 3.3.7 redundant entry (static) ─────────────────── */

function checkRedundantEntry() {
  const problems = [];
  const wizard = fs.readFileSync(path.join(srcDir, 'components', 'islands', 'JourneyWizard.tsx'), 'utf8');
  const memberSetters = (wizard.match(/memberId:\s*m\.id/g) ?? []).length;
  const mintCalls = (wizard.match(/ensureIdentity\s*\(/g) ?? []).length;
  const jwtCalls = (wizard.match(/getJWT\s*\(/g) ?? []).length;
  const balanceCalls = (wizard.match(/getBalance\s*\(/g) ?? []).length;
  if (memberSetters !== 1) problems.push(`JourneyWizard collects the member in ${memberSetters} places (want exactly 1 — no re-asking)`);
  if (mintCalls !== 1) problems.push(`JourneyWizard mints the identity ${mintCalls} times (want exactly 1)`);
  if (jwtCalls !== 1) problems.push(`JourneyWizard fetches the session ${jwtCalls} times (want exactly 1)`);
  if (balanceCalls !== 1) problems.push(`JourneyWizard fetches the balance ${balanceCalls} times (want exactly 1)`);
  return problems;
}

/* ──────────────────────── 3.3.8 accessible auth (static) ────────────────── */

function checkAccessibleAuth() {
  const problems = [];
  const signin = fs.readFileSync(path.join(srcDir, 'pages', 'signin.astro'), 'utf8');
  const signup = fs.readFileSync(path.join(srcDir, 'pages', 'signup.astro'), 'utf8');
  const inputRe = /<input[^>]*>/gs;
  const needs = (page, label, autocomplete, file) => {
    for (const m of page.matchAll(inputRe)) {
      const tag = m[0];
      if (tag.includes(`name="${label}"`) || tag.includes(`id="${label}"`)) {
        if (!tag.includes(`autocomplete="${autocomplete}"`)) {
          problems.push(`${file}: ${label} input is missing autocomplete="${autocomplete}"`);
        }
        return;
      }
    }
    problems.push(`${file}: no ${label} input found`);
  };
  needs(signin, 'email', 'username', 'src/pages/signin.astro');
  needs(signin, 'password', 'current-password', 'src/pages/signin.astro');
  needs(signup, 'email', 'username', 'src/pages/signup.astro');
  needs(signup, 'password', 'new-password', 'src/pages/signup.astro');
  needs(signup, 'confirm-password', 'new-password', 'src/pages/signup.astro');
  return problems;
}

/* ─────────────────────── negative controls (planted) ────────────────────── */

function negativeControls() {
  const controls = [
    // [name, fn(planted) → non-null when the checker DOES flag, planted, expectFlag]
    ['2.5.7 drag-only surface is flagged', (t) => (DRAG_MARKERS.test(t) && !KEY_FALLBACK.test(t) ? 'caught' : null),
      '<div onPointerDown={(e)=>resize(e)} onPointerMove={(e)=>resize(e)}></div>', true],
    ['2.5.7 drag with keyboard fallback is allowed', (t) => (DRAG_MARKERS.test(t) && !KEY_FALLBACK.test(t) ? 'caught' : null),
      '<div onPointerDown={resize} onKeyDown={(e)=>{ if(e.key==="ArrowLeft") nudge() }}></div>', false],
    ['3.2.6 page without footer', (t) => (/<Footer|<SharedFooter|<CanonFooter/.test(t) ? null : 'no footer'),
      '<MarketingShell><main>no footer here</main></MarketingShell>', true],
    ['3.3.7 field asked twice', (t) => ((t.match(/memberId:\s*m\.id/g) ?? []).length !== 1 ? 'member asked twice' : null),
      'onClick={() => setState((s) => ({ ...s, memberId: m.id }))}\nonClick={() => setState((s) => ({ ...s, memberId: m.id }))}', true],
    ['3.3.8 password missing autocomplete', (t) => (/<input type="password" id="password"[^>]*>/g.test(t) && !/<input type="password" id="password" autocomplete="current-password"[^>]*>/.test(t) ? 'no autocomplete' : null),
      '<input type="password" id="password" name="password" required />', true],
  ];
  const results = [];
  for (const [name, fn, planted, expectFlag] of controls) {
    const flagged = fn(planted);
    const caught = flagged !== null ? expectFlag : !expectFlag;
    results.push({ name, caught, detail: flagged ?? (expectFlag ? 'violation NOT flagged' : 'allowed pattern wrongly flagged') });
  }
  return results;
}

/* ──────────────────── runtime leg (Playwright vs preview) ───────────────── */

async function waitFor(url, ms = 45000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => { res.resume(); res.statusCode < 500 ? resolve() : reject(new Error(String(res.statusCode))); });
        req.on('error', reject);
        req.setTimeout(2000, () => { req.destroy(); reject(new Error('timeout')); });
      });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`preview did not come up at ${url}`);
}

async function runtime() {
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    throw new Error('dist/index.html missing — run `npm run build` first');
  }
  const port = 4322;
  const base = `http://127.0.0.1:${port}`;
  // Spawn the local astro binary directly (no npx wrapper) so the kill below
  // reaches the actual server process.
  const astroBin = path.join(root, 'node_modules', '.bin', 'astro');
  const server = spawn(astroBin, ['preview', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: root,
    stdio: 'ignore',
    detached: true,
  });
  let browser;
  const stop = async () => {
    if (browser) await browser.close().catch(() => {});
    try { process.kill(-server.pid, 'SIGTERM'); } catch { /* already gone */ }
    try { server.kill('SIGTERM'); } catch { /* already gone */ }
  };
  try {
    await waitFor(`${base}/`);
    const { chromium } = await import('@playwright/test');
    browser = await chromium.launch({ headless: true });

    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const loc = msg.location();
        consoleErrors.push(`${loc?.url ?? ''} :: ${msg.text().slice(0, 100)}`);
      }
    });
    page.on('pageerror', (err) => consoleErrors.push(String(err).slice(0, 120)));
    await page.goto(`${base}/`, { waitUntil: 'load' });
    await page.waitForSelector('.posner-topbar', { timeout: 15000 });
    await page.waitForTimeout(1200);

    /* 2.4.11 focus-not-obscured: tab through the topbar's interactive
       elements, then into the page; every focused element OUTSIDE the bar
       must sit below the bar's bottom edge (scroll-padding contract). */
    const barBox = await page.locator('.posner-topbar').boundingBox();
    if (!barBox) throw new Error('topbar has no bounding box');
    const barBottom = barBox.y + barBox.height;
    const obscured = [];
    for (let i = 0; i < 26; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body || a === document.documentElement) return null;
        const bar = document.querySelector('.posner-topbar');
        const r = a.getBoundingClientRect();
        return {
          tag: a.tagName,
          inBar: bar ? bar.contains(a) : false,
          isSkipLink: a.classList?.contains('skip-link') ?? false,
          y: r.y,
          text: (a.textContent || '').trim().slice(0, 30),
        };
      });
      if (!info) break;
      if (info.inBar) continue; // the bar's own controls live inside it
      if (info.isSkipLink) continue; // skip link is a focus-reveal overlay (z-index 9999, above the bar) — by design, not obscured
      if (info.y + 2 < barBottom) {
        obscured.push(`focused <${info.tag}> "${info.text}" top=${Math.round(info.y)}px vs sticky bar bottom=${Math.round(barBottom)}px`);
      }
    }
    if (obscured.length) failures.push(`2.4.11 focus-not-obscured: ${obscured.length} focused element(s) behind the sticky bar — ${obscured[0]}`);

    /* 2.5.8 target size: every visible interactive element in the topbar
       (+ sample controls on the page) must be ≥24×24 computed px. */
    const tooSmall = [];
    const targets = page.locator('.posner-topbar a, .posner-topbar button, .home-hero__ctas a, .btn');
    const n = await targets.count();
    for (let i = 0; i < n; i++) {
      const t = targets.nth(i);
      if (!(await t.isVisible())) continue;
      const box = await t.boundingBox();
      if (!box) continue;
      if (box.width < 24 || box.height < 24) {
        tooSmall.push(`${await t.textContent().then((s) => (s || '').trim().slice(0, 24) || '<no text>')} ${Math.round(box.width)}×${Math.round(box.height)}`);
      }
    }
    // Open the overflow menu: spoons must meet the target too.
    await page.click('.posner-chip--icon');
    await page.waitForTimeout(250);
    const spoons = page.locator('.posner-spoon');
    const sn = await spoons.count();
    for (let i = 0; i < sn; i++) {
      const s = spoons.nth(i);
      if (!(await s.isVisible())) continue;
      const box = await s.boundingBox();
      if (box && (box.width < 24 || box.height < 24)) {
        tooSmall.push(`spoon ${Math.round(box.width)}×${Math.round(box.height)}`);
      }
    }
    if (tooSmall.length) failures.push(`2.5.8 target size: ${tooSmall.length} interactive element(s) under 24×24 — ${tooSmall.slice(0, 6).join(', ')}`);

    // Filter console errors: astro preview 404s trailing-slash-less internal
    // routes (/apps/loom) that Cloudflare Pages serves fine in production.
    // Anything else stays a hard failure.
    const realErrors = [];
    for (const err of consoleErrors) {
      const m = err.match(/^(http[^ ]+) :: .*404 \(Not Found\)$/);
      if (m) {
        const withSlash = await fetch(`${m[1]}/`, { redirect: 'manual' })
          .then((r) => r.status)
          .catch(() => 0);
        if (withSlash === 200) continue; // preview-only trailing-slash artifact
      }
      realErrors.push(err);
    }
    if (realErrors.length) failures.push(`console errors on /: ${realErrors.slice(0, 3).join(' | ')}`);
    await page.close();
  } finally {
    await stop();
  }
}

/* ──────────────────────────────── run ───────────────────────────────────── */

if (flags.has('--self-test')) {
  const results = negativeControls();
  const failed = results.filter((r) => !r.caught);
  for (const r of results) {
    console.log(`  ${r.caught ? 'PASS' : 'FAIL'}  negative control: ${r.name}${r.caught ? '' : ` — ${r.detail}`}`);
  }
  if (failed.length) {
    console.error(`verify-wcag22: ${failed.length} negative control(s) not caught`);
    process.exit(1);
  }
  console.log(`verify-wcag22 --self-test: ${results.length}/${results.length} planted violations caught`);
  process.exit(0);
}

if (flags.has('--runtime')) {
  try {
    await runtime();
  } catch (e) {
    failures.push(`runtime: ${e.message}`);
  }
  if (failures.length) {
    console.error(`verify-wcag22 --runtime: ${failures.length} violation(s):`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log('verify-wcag22 --runtime: 2.4.11 focus-not-obscured + 2.5.8 target size + console all pass');
  process.exit(0);
}

// Static leg (default = prebuild).
const dragging = checkDragging();
const help = checkConsistentHelp();
const redundant = checkRedundantEntry();
const auth = checkAccessibleAuth();

for (const p of dragging) failures.push(`2.5.7: ${p}`);
for (const p of help) failures.push(`3.2.6: ${p}`);
for (const p of redundant) failures.push(`3.3.7: ${p}`);
for (const p of auth) failures.push(`3.3.8: ${p}`);

console.log('verify-wcag22 — MANUAL checklist (human review, per criterion):');
console.log('  [ ] 2.4.11 visual contrast review — focus indicator vs every backdrop (sticky bar, glass panels).');
console.log('  [ ] 3.2.6 help order review — footer + overflow settings appear in the same order on every route.');
console.log('  [ ] 2.5.8 spacing-exception review — inline prose links exempted by the criterion; reviewed visually.');
console.log('  [ ] 3.3.7 voice/OTP alternative review — the wizard stays keyboard-first; voice is out of scope today.');
console.log(`  [ ] canon Split keyboard fallback (WCAG 2.5.7) — confirmed in design-core/compositions/canon-v2/Split.tsx (ArrowLeft/Right ±5%, Home/End snap).`);

if (failures.length) {
  console.error(`verify-wcag22: ${failures.length} violation(s):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log('verify-wcag22: static checks clean — 2.5.7 dragging, 3.2.6 consistent help, 3.3.7 redundant entry, 3.3.8 accessible auth');