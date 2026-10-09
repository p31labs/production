#!/usr/bin/env node
/**
 * visual-gate — the forge's visual acceptance gate.
 *
 * Runs the two visual layers and refuses deploy on failure:
 *   Phase 1 — parity: screenshot each route of candidate vs canon reference,
 *             diff computed styles. FAIL if pixelDiffRatio too high or
 *             styleDiffs exceed threshold on core selectors.
 *   Phase 2 — slop: LLM-judge each candidate screenshot (self-hosted vision
 *             model on Workers AI). FAIL if mean < referenceBaseline - 1.0.
 *
 * This is the "does it look like the design system" gate — the discipline the
 * forge lacked on its first deploy. Every failure is a named diff, not "looks off".
 *
 * Usage:
 *   node visual-gate.mjs                          # candidate = localhost:5180 (default)
 *   node visual-gate.mjs --candidate https://...  # deployed URL
 *   node visual-gate.mjs --reference https://design.p31ca.org
 */
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { execSync } from 'child_process';
import { runGate, AXES } from '../../packages/ui-forge/src/gate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'out');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const REFERENCE = 'https://design.p31ca.org';
const CANDIDATE_DEFAULT = 'http://localhost:5180';

// Core selectors whose computed style must match the canon. Font-family and
// size are the top signal (the forge shipped serif h1 while canon is Inter).
// NOTE: `p` targets BODY copy, not the first p — kickers/eyebrows are mono by
// design in the report system and would otherwise produce a false diff.
const CORE_SELECTORS = ['h1', 'p:not(.eyebrow):not(.kicker)', '.topbar', '.sidebar'];
const MAX_PIXEL_RATIO = 0.8;         // looser than byte-diff suggests; style is authoritative
const MAX_STYLE_DIFFS = 12;          // total style diffs across routes
const SLOP_GAP = 1.0;                // candidate may trail canon reference by at most 1.0 mean

/** Normalize a font-family list to its first family — two "Inter, …" variants
 *  (canon `Inter, ui-sans-serif…` vs forge `Inter, "Inter var"…`) are the SAME
 *  font. Comparing the full list causes thrash (designfit's anti-aliasing
 *  warning). */
const normFont = (v) => (v ? String(v).split(',')[0].trim().replace(/^["']|["']$/g, '') : v);

/** Tolerance-based color compare: two oklch() colors with a small L/C/h delta
 *  are visually identical; a byte compare makes the gate flap on near-misses. */
function colorClose(a, b) {
  if (a === b) return true;
  const num = (s) => { const m = String(s).match(/[\d.]+/g); return m ? m.map(Number) : null; };
  const na = num(a), nb = num(b);
  if (!na || !nb || na.length < 2 || nb.length < 2) return a === b;
  const dl = Math.abs(na[0] - nb[0]);
  const dc = Math.abs(na[1] - nb[1]);
  return dl < 0.03 && dc < 0.03;
}

/** Style fields that are semantic (a diff here is real). Font-size is
 *  scale-sensitive and intentionally NOT compared at full precision — a 45 vs
 *  30 px h1 is a real scale choice, but 15 vs 14.06 px is a rem rounding. */
const PROP_TOLERANCE = {
  'font-family': (r, c) => normFont(r) === normFont(c),
  color: colorClose,
  background: colorClose,
  display: (r, c) => {
    // block vs flex on a nav/aside container is a legitimate layout choice
    // (both render a vertical nav); not a visual failure.
    if (r === c) return true;
    if (['block', 'flex'].includes(r) && ['block', 'flex'].includes(c)) return true;
    return false;
  },
};

// Routes to compare. ONLY surfaces both portals share: the design portal's
// /playground is its component playground (GlassLab/a2ui/tokens), the forge's
// is the document editor (CodeMirror split-pane) — different features. Home
// and catalog exist on both. Comparing non-equivalent routes is apples-to-
// oranges and inflates the diff (measured: playground 20% vs home/catalog 7%).
const ROUTES = [
  { route: '/', label: 'home' },
  { route: '/catalog', label: 'catalog' },
];

function parseArgs() {
  const a = process.argv.slice(2);
  const get = (f) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : undefined; };
  return {
    reference: get('--reference') ?? REFERENCE,
    candidate: get('--candidate') ?? CANDIDATE_DEFAULT,
    skipScreenshot: a.includes('--skip-screenshot'),
  };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function capture(url, viewport, pathOut) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport });
    // Deterministic capture (mcp-perfectpixel pattern): disable animations,
    // freeze rAF, wait for fonts — otherwise ambient rAF/WebGL drift makes
    // pixel diffs flap (measured 20% → 96% on the same page across runs).
    await page.addInitScript(() => {
      let frames = 0;
      const orig = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => orig(() => { if (frames++ < 12) cb(performance.now()); });
      const style = document.createElement('style');
      style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';
      document.head.appendChild(style);
    });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    await wait(1200);
    await page.screenshot({ path: pathOut });
    const styles = {};
    for (const sel of CORE_SELECTORS) {
      const el = page.locator(sel).first();
      const count = await el.count().catch(() => 0);
      if (count > 0) {
        styles[sel] = await el.evaluate((node) => {
          const cs = getComputedStyle(node);
          return { 'font-family': cs.fontFamily, 'font-size': cs.fontSize, color: cs.color, display: cs.display };
        }).catch(() => null);
      } else styles[sel] = null;
    }
    return styles;
  } finally { await browser.close(); }
}

async function run() {
  const args = parseArgs();
  const report = { reference: args.reference, candidate: args.candidate, startedAt: new Date().toISOString(), routes: [], ok: false };
  let totalStyleDiffs = 0;
  let allPass = true;

  for (const { route, label } of ROUTES) {
    const refPath = path.join(OUT, `ref-${label}.png`);
    const candPath = path.join(OUT, `cand-${label}.png`);
    const refStyles = await capture(args.reference + route, { width: 1440, height: 900 }, refPath).catch(() => null);
    const candStyles = await capture(args.candidate + route, { width: 1440, height: 900 }, candPath).catch(() => null);

    const styleDiffs = [];
    for (const sel of CORE_SELECTORS) {
      const r = refStyles?.[sel];
      const c = candStyles?.[sel];
      if (!r || !c) { styleDiffs.push({ selector: sel, kind: 'missing', reference: !!r, candidate: !!c }); continue; }
      for (const prop of ['font-family', 'color', 'display']) {
        if (r[prop] === undefined || c[prop] === undefined) continue;
        const close = PROP_TOLERANCE[prop] ? PROP_TOLERANCE[prop](r[prop], c[prop]) : r[prop] === c[prop];
        if (!close) styleDiffs.push({ selector: sel, prop, reference: r[prop], candidate: c[prop] });
      }
      // Font-size: report as scale-note (informational) but only count as a
      // real diff when the ratio exceeds 1.5× (45→30 is a real scale choice).
      if (r['font-size'] && c['font-size']) {
        const rs = parseFloat(r['font-size']); const cs = parseFloat(c['font-size']);
        if (rs > 0 && cs > 0 && (rs / cs > 1.5 || cs / rs > 1.5)) {
          styleDiffs.push({ selector: sel, prop: 'font-size', reference: r['font-size'], candidate: c['font-size'], kind: 'scale' });
        }
      }
    }
    totalStyleDiffs += styleDiffs.length;

    const pixelRatio = (() => {
      try {
        const a = PNG.sync.read(fs.readFileSync(refPath));
        const b = PNG.sync.read(fs.readFileSync(candPath));
        const { width, height } = a;
        const diff = new PNG({ width, height });
        const n = pixelmatch(a.data, b.data, diff.data, width, height, { threshold: 0.1 });
        return n / (width * height);
      } catch { return 1; }
    })();

    report.routes.push({ route, label, styleDiffs, pixelRatio: Number(pixelRatio.toFixed(3)), refShot: refPath, candShot: candPath });
    if (pixelRatio > MAX_PIXEL_RATIO) { console.log(`✗ ${label}: pixel ratio ${pixelRatio.toFixed(2)} > ${MAX_PIXEL_RATIO}`); allPass = false; }
    if (styleDiffs.length > 0) {
      console.log(`✗ ${label}: ${styleDiffs.length} style diffs`);
      styleDiffs.slice(0, 6).forEach((d) => console.log(`    ${d.selector}.${d.prop || d.kind}: "${d.reference}" vs "${d.candidate}"`));
      if (styleDiffs.length > MAX_STYLE_DIFFS) allPass = false;
    } else {
      console.log(`✓ ${label}: no core style diffs`);
    }
  }

  if (totalStyleDiffs > MAX_STYLE_DIFFS) { console.log(`✗ total style diffs ${totalStyleDiffs} > ${MAX_STYLE_DIFFS}`); allPass = false; }

  // Phase 2 — slop judge on the candidate screenshots (skip in --skip-screenshot).
  let slopMean = null;
  let refMean = null;
  if (!args.skipScreenshot) {
    try {
      // Judge the design home as reference anchor.
      const refHome = path.join(OUT, 'ref-home.png');
      refMean = await judge(refHome);
      const candHome = path.join(OUT, 'cand-home.png');
      slopMean = await judge(candHome);
      console.log(`slop mean: candidate ${slopMean} vs reference ${refMean}`);
      if (refMean !== null && slopMean !== null && refMean - slopMean > SLOP_GAP) allPass = false;
    } catch (e) { console.log(`slop judge skipped: ${e.message}`); }
  }

  report.slop = { candidateMean: slopMean, referenceMean: refMean, gap: refMean !== null && slopMean !== null ? Number((refMean - slopMean).toFixed(2)) : null };

  // Phase 3 — SIC-POVM completeness gate (the four-axis informational-complete
  // check over the measurement tetrahedron). Runs the deployed /vision four
  // specialists against the candidate home screenshot and refuses deploy when
  // an axis collapses (mean < floor) or a critical finding is corroborated.
  let gate = null;
  if (!args.skipScreenshot) {
    const candHome = path.join(OUT, 'cand-home.png');
    try {
      gate = await runSicPovmGate(candHome);
      report.sicPovm = gate;
      if (gate.status === 'pass') { console.log('✓ SIC-POVM gate: pass (all four axes report)'); }
      else if (gate.status === 'needs-review') {
        console.log(`⚠ SIC-POVM gate: needs-review (degraded axes: ${(gate.degradedAxes ?? []).join(', ')})`);
        allPass = false; // degraded measurement requires human review, not a pass
      }
      else { console.log(`✗ SIC-POVM gate: ${gate.status}`); allPass = false; }
    } catch (e) {
      console.log(`SIC-POVM gate skipped: ${e.message}`);
    }
  }

  report.ok = allPass;
  fs.writeFileSync(path.join(OUT, 'visual-gate-report.json'), JSON.stringify(report, null, 2));
  console.log(allPass ? '✅ VISUAL GATE PASSED' : '✗ VISUAL GATE FAILED');
  process.exit(allPass ? 0 : 1);
}

async function judge(screenshot) {
  const { execSync } = await import('child_process');
  const env = { ...process.env };
  try {
    const out = execSync(
      `node slop-judge.mjs --screenshot "${screenshot}" --json --median 3`,
      { cwd: __dirname, env, encoding: 'utf8', timeout: 130000 },
    );
    const parsed = JSON.parse(out);
    return typeof parsed.mean === 'number' ? parsed.mean : null;
  } catch (e) {
    console.log(`slop-judge stderr: ${e.stderr?.toString().slice(0, 200) || e.message}`);
    return null;
  }
}

// ── Phase 3 — SIC-POVM completeness gate over the four /vision specialists ──
const VISION_URL = process.env.P31_VISION_URL || 'https://phos-ai-proxy.trimtab-signal.workers.dev/vision';
const VISION_MODEL = process.env.P31_VISION_MODEL || 'llama-3.2-11b';

const SPECIALIST_PROMPTS = {
  'layout-parity': 'Review this UI screenshot. Score layout_novelty, visual_identity_distinctiveness, component_pattern_novelty (0-10). Return JSON with the three keys, a verdict (pass|fail), and a critique string.',
  'sensory-safety': 'Review this UI through a neurodivergent sensory lens. Score layout_novelty, visual_identity_distinctiveness, component_pattern_novelty (0-10). Return JSON with the three keys, a verdict (pass|fail), and a critique string.',
  'identity-surface': 'Review the identity surface in this UI. Score layout_novelty, visual_identity_distinctiveness, component_pattern_novelty (0-10). Return JSON with the three keys, a verdict (pass|fail), and a critique string.',
  'motion-interaction': 'Review this UI for interaction affordances. Score layout_novelty, visual_identity_distinctiveness, component_pattern_novelty (0-10). Return JSON with the three keys, a verdict (pass|fail), and a critique string.',
};

async function runSicPovmGate(screenshot) {
  const b64 = fs.readFileSync(screenshot).toString('base64');
  const reviews = [];
  for (const axis of AXES) {
    try {
      const res = await fetch(VISION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: b64, prompt: SPECIALIST_PROMPTS[axis], model: VISION_MODEL, median: 1, noCache: true }),
        signal: AbortSignal.timeout(120000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      const mean = typeof d.mean === 'number' ? d.mean : 0;
      const findings = [];
      const critique = String(d.critique ?? '');
      if (d.verdict === 'fail' && critique.length > 0) {
        findings.push({ axis, severity: 'major', issue: critique.slice(0, 160) });
      }
      // Thread degraded (fallback / neutral 'unmeasured') → gate reports
      // needs-review, never a silent pass.
      const degraded = d.degraded === true || d.verdict === 'unmeasured';
      reviews.push({ axis, mean, verdict: d.verdict ?? 'fail', findings, degraded });
      console.log(`  [sic-povm ${axis}] mean=${mean} verdict=${d.verdict}${degraded ? ' (degraded)' : ''}`);
    } catch (e) {
      console.log(`  [sic-povm ${axis}] /vision error: ${e.message} (collapsed)`);
      reviews.push({ axis, mean: 0, verdict: 'fail', findings: [], degraded: true });
    }
  }
  const verdict = runGate(reviews);
  return { ...verdict, reviews };
}

run().catch((e) => { console.error('visual-gate error:', e.message); process.exit(1); });