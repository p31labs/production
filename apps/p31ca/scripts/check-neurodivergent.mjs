#!/usr/bin/env node
/**
 * check-neurodivergent — the neurodivergent-design gate (void-fill wave 3).
 *
 * Research-locked rules (see docs/STRATEGIC-POSITIONING.md + the neurodivergent
 * design frame). Every rule is a sensor, not prose; every rule carries a
 * negative control (plant a violation, the check must catch it).
 *
 *   (a) one filled-accent primary CTA per viewport — the accent-filled CTA
 *       recipe is `btn btn-primary` (canon, background: var(--p31-accent)) or
 *       an inline `background: var(--p31-accent)` on <a>/<button>. Static:
 *       at most ONE per section / CTA row per page. Island steps (.tsx) are
 *       checked per conditional step block (JourneyWizard renders one step).
 *   (b) consistent layout per page-type — MANUAL item (documented, printed).
 *   (c) no autoplay, no flashing (`steps(` animations), and
 *       prefers-reduced-motion respected (the hub CSS must carry the media
 *       query — ambient motion already gates on it).
 *   (d) content control — the shell must render the skip-to-content link
 *       (MarketingShell skip-link → #main-content).
 *   (e) predictable nav — NAV_ATOMS in src/lib/nav.ts is the ONLY act-nav
 *       source; no other file may define act atoms.
 *   (f) plain heading hierarchy — H1→H2→H3, no skips, ≤3 levels. Source-level:
 *       no h4/h5/h6 anywhere in src; no same-file level skips. Dist-level
 *       (--dist, run postbuild): per rendered page — first heading is the
 *       single h1, no skips, ≤3 levels.
 *
 * Usage:
 *   node scripts/check-neurodivergent.mjs          — prebuild leg (source rules)
 *   node scripts/check-neurodivergent.mjs --dist   — postbuild leg (rendered pages)
 *   node scripts/check-neurodivergent.mjs --self-test — negative controls only
 *
 * Exit 0 = clean; exit 1 = at least one rule violation.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const ONLY_SELF_TEST = process.argv.includes('--self-test');
const RUN_DIST = process.argv.includes('--dist');

/** Walk a directory for files matching `match`. */
function collect(dir, match, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, match, out);
    else if (match.test(entry.name)) out.push(full);
  }
  return out;
}

const srcDir = path.join(root, 'src');
const distDir = path.join(root, 'dist');
const pages = collect(path.join(srcDir, 'pages'), /\.astro$/);
const components = [
  ...collect(path.join(srcDir, 'components'), /\.astro$/),
  ...collect(path.join(srcDir, 'components'), /\.tsx$/),
];
const islands = collect(path.join(srcDir, 'components', 'islands'), /\.tsx$/);

const failures = [];
function rule(name, ok, detail) {
  if (!ok) failures.push(`${name}: ${detail}`);
  return ok;
}

/* ───────────────────────── (a) one filled-accent CTA ─────────────────────── */

const ACCENT_CTA_ASTRO =
  /<(a|button)\b[^>]*(?:background\s*:\s*var\(--p31-accent\)|btn\s+btn-primary)[^>]*>/gs;
// Chrome is constant across pages (the topbar's sign-in chip is the one
// accent-filled chrome element, checked by rule (e) instead).
const CHROME_FILES = /CanonTopbar|JourneyNav|ThemePicker|CommandPalette|LedController|Footer\.astro|SharedFooter\.astro|Header\.astro|Starfield|MolecularHeart|DomeStarfield|HeartPulse|MeatspaceMesh|SpaceshipDome|TerminalDemo|ModeGateDemo|ExplorableChain|GovernanceGallery|LumiToken|MCPRegistryQuery|CommandPalette/;

/** Count accent-CTA markers per <section>/<article> container (one viewport
 *  region = one container). Chrome files are excluded (constant across pages). */
function accentCtaViolationsAstro(file) {
  const text = fs.readFileSync(file, 'utf8');
  const problems = [];
  const chunks = text.split(/<(section|article)\b[^>]*>/i);
  chunks.forEach((chunk, i) => {
    const matches = chunk.match(ACCENT_CTA_ASTRO) ?? [];
    if (matches.length > 1) {
      problems.push(`region ${i}: two accent-filled CTAs share one section (${matches[0].slice(0, 60)} | ${matches[1].slice(0, 60)})`);
    }
  });
  return problems;
}

/** Count accent-CTA markers per conditional step block in island .tsx. */
function accentCtaViolationsTsx(file) {
  const text = fs.readFileSync(file, 'utf8');
  const out = [];
  // Split into guarded render blocks ({cond && ( … )}); each block is one
  // rendered state (e.g. one wizard step = one viewport).
  const parts = text.split(/(?=\{[\s\S]{0,120}&&\s*\()/);
  parts.forEach((part, i) => {
    const matches = part.match(/(?:btn\s+btn-primary|var\(--p31-accent\))/g) ?? [];
    if (matches.length > 1) {
      out.push(`block ${i}: ${matches.length} accent-filled CTAs in one render state`);
    }
  });
  return out;
}

function checkAccentCtas() {
  const problems = [];
  for (const file of pages) {
    if (CHROME_FILES.test(file)) continue;
    for (const v of accentCtaViolationsAstro(file)) {
      problems.push(`${path.relative(root, file)}: ${v}`);
    }
  }
  for (const file of components) {
    if (CHROME_FILES.test(file)) continue;
    const hits = file.endsWith('.astro')
      ? accentCtaViolationsAstro(file)
      : accentCtaViolationsTsx(file);
    for (const v of hits) problems.push(`${path.relative(root, file)}: ${v}`);
  }
  return problems.length === 0 ? null : problems.join('\n    ');
}

/* ───────────────────── (c) motion: autoplay / flashing / reduced-motion ──── */

function checkMotion() {
  const css = [
    ...collect(path.join(srcDir, 'styles'), /\.css$/),
    ...collect(path.join(srcDir, 'pages'), /\.astro$/),
    ...collect(path.join(srcDir, 'components'), /\.astro$/),
    ...collect(path.join(srcDir, 'components'), /\.tsx$/),
  ];
  const autoplayHits = [];
  const flashingHits = [];
  let reducedMotionHits = 0;
  for (const file of css) {
    const text = fs.readFileSync(file, 'utf8');
    for (const [i, line] of text.split('\n').entries()) {
      if (/autoplay/i.test(line)) autoplayHits.push(`${path.relative(root, file)}:${i + 1}`);
      if (/steps\(\s*\d/i.test(line)) flashingHits.push(`${path.relative(root, file)}:${i + 1}`);
    }
    if (/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i.test(text)) reducedMotionHits++;
  }
  const problems = [];
  if (autoplayHits.length) problems.push(`autoplay: ${autoplayHits.join(', ')}`);
  if (flashingHits.length) problems.push(`flashing steps() animation: ${flashingHits.join(', ')}`);
  if (reducedMotionHits === 0) problems.push('no @media (prefers-reduced-motion: reduce) in the hub css');
  return problems.length === 0 ? null : problems.join('\n    ');
}

/* ─────────────────────── (d) skip-to-content link ───────────────────────── */

function checkSkipLink() {
  const shell = fs.readFileSync(path.join(srcDir, 'layouts', 'MarketingShell.astro'), 'utf8');
  if (!/class="skip-link"/.test(shell)) return 'MarketingShell has no .skip-link anchor';
  if (!/href="#main-content"/.test(shell)) return 'skip link does not target #main-content';
  if (!/id="main-content"/.test(shell)) return 'the shell renders no #main-content target';
  return null;
}

/* ─────────────────────────── (e) predictable nav ────────────────────────── */

function checkNavSource() {
  const navFile = path.join(srcDir, 'lib', 'nav.ts');
  const navText = fs.readFileSync(navFile, 'utf8');
  const defs = (navText.match(/export const NAV_ATOMS/g) ?? []).length;
  if (defs !== 1) return `NAV_ATOMS defined ${defs} times in src/lib/nav.ts (want 1)`;
  // No other source file may define act atoms.
  const others = [...collect(srcDir, /\.(ts|tsx|astro|mjs)$/)];
  const rogue = [];
  for (const file of others) {
    if (path.resolve(file) === path.resolve(navFile)) continue;
    if (/node_modules/.test(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (/(^|[^a-zA-Z])act\s*:\s*['"]/m.test(text)) rogue.push(path.relative(root, file));
  }
  if (rogue.length) return `act atoms defined outside src/lib/nav.ts: ${rogue.join(', ')}`;
  // The chrome must consume the single source.
  const topbar = fs.readFileSync(path.join(srcDir, 'components', 'islands', 'CanonTopbar.tsx'), 'utf8');
  if (!/from ['"].*lib\/nav['"]/.test(topbar)) return 'CanonTopbar does not import from lib/nav';
  if (!/NAV_ATOMS\.filter/.test(topbar)) return 'CanonTopbar does not render from NAV_ATOMS';
  return null;
}

/* ─────────────────────── (f) heading hierarchy ──────────────────────────── */

const HEADING_RE = /<h([1-6])\b/g;

function headingProblemsSrc() {
  const problems = [];
  const files = [...pages, ...components];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    // ≤3 levels: h4/h5/h6 banned anywhere in src.
    for (const [i, line] of text.split('\n').entries()) {
      const deep = line.match(/<h([4-6])\b/);
      if (deep) problems.push(`${path.relative(root, file)}:${i + 1}: <h${deep[1]}> — max heading level is 3`);
    }
  }
  return problems.length === 0 ? null : problems.join('\n    ');
}

function headingProblemsDist() {
  const problems = [];
  // Only check routes authored in src/pages (static legacy public/*.html
  // files are out of this gate's scope — see the fix-plan for the legacy set).
  const routes = [];
  for (const f of collect(path.join(srcDir, 'pages'), /\.astro$/)) {
    const rel = path.relative(path.join(srcDir, 'pages'), f).replace(/\.astro$/, '');
    if (rel === 'index') {
      routes.push({ kind: 'exact', html: path.join(distDir, 'index.html'), label: '/' });
    } else if (rel === '404') {
      routes.push({ kind: 'exact', html: path.join(distDir, '404.html'), label: '/404' });
    } else if (rel.endsWith('/index')) {
      const p = rel.slice(0, -'/index'.length);
      routes.push({ kind: 'exact', html: path.join(distDir, p, 'index.html'), label: `/${p}` });
    } else if (rel.includes('[')) {
      const prefix = rel.slice(0, rel.indexOf('[')).replace(/\/$/, '');
      routes.push({ kind: 'dir', base: path.join(distDir, prefix), label: `/${prefix}/<dynamic>` });
    } else {
      routes.push({ kind: 'exact', html: path.join(distDir, rel, 'index.html'), label: `/${rel}` });
    }
  }
  const htmlFiles = [];
  for (const r of routes) {
    if (r.kind === 'exact') {
      if (fs.existsSync(r.html)) htmlFiles.push([r.label, r.html]);
      else problems.push(`${r.label}: missing built page`);
    } else {
      htmlFiles.push(...collect(r.base, /index\.html$/).map((f) => [`${r.label}: ${path.relative(r.base, f)}`, f]));
    }
  }
  for (const [label, file] of htmlFiles) {
    // The shared chrome footer's column titles come from the canon Footer
    // (h4s) — canon-lane fix filed; strip footer chrome from the content scan.
    // IndieWeb `hidden` h1s (p-name) are microformat metadata, not visible
    // headings — strip those too.
    const text = fs
      .readFileSync(file, 'utf8')
      .replace(/<footer\b[\s\S]*?<\/footer>/gi, '')
      .replace(/<h[1-6]\b[^>]*\bhidden\b[^>]*>[\s\S]*?<\/h[1-6]>/gi, '');
    const seq = [];
    for (const m of text.matchAll(HEADING_RE)) seq.push(Number(m[1]));
    if (seq.length === 0) {
      problems.push(`${label}: page renders no headings`);
      continue;
    }
    if (seq[0] !== 1) problems.push(`${label}: first heading is h${seq[0]}, not h1`);
    if (seq.filter((l) => l === 1).length > 1) problems.push(`${label}: more than one h1`);
    let prev = null;
    for (const lvl of seq) {
      if (prev !== null && lvl > prev + 1) {
        problems.push(`${label}: heading skip h${prev}→h${lvl}`);
        break;
      }
      prev = lvl;
    }
    if (seq.some((l) => l > 3)) problems.push(`${label}: heading deeper than h3`);
  }
  return problems.length === 0 ? null : problems.join('\n    ');
}

/* ────────────────────── negative controls (planted) ─────────────────────── */

function negativeControls() {
  const catches = [];
  const expectCaught = (name, fn, planted) => {
    const result = fn(planted);
    catches.push({ name, caught: Boolean(result), detail: result ?? 'planted violation was NOT caught' });
  };

  // (a) two accent CTAs in one section (astro-shaped chunk).
  expectCaught(
    'accent-CTA-per-viewport',
    (t) => {
      const m = t.match(ACCENT_CTA_ASTRO) ?? [];
      return m.length > 1 ? 'two accent CTAs in one region' : null;
    },
    '<section><a href="/a" class="btn btn-primary">One</a><a href="/b" class="btn btn-primary">Two</a></section>'
  );

  // (a) two accent CTAs in one island render state.
  expectCaught(
    'accent-CTA-per-render-state (island)',
    (t) => {
      const parts = t.split(/(?=\{[\s\S]{0,120}&&\s*\()/);
      return parts.some((p) => ((p.match(/btn\s+btn-primary/g) ?? []).length > 1)) ? 'caught' : null;
    },
    '{step === 1 && (<div><button class="btn btn-primary">A</button><button class="btn btn-primary">B</button></div>)}'
  );

  // (c) autoplay.
  expectCaught('autoplay', (t) => (/autoplay/i.test(t) ? 'autoplay present' : null), '<video autoplay src="x.mp4"></video>');

  // (c) flashing steps().
  expectCaught(
    'flashing steps() animation',
    (t) => (/steps\(\s*\d/i.test(t) ? 'steps() animation present' : null),
    '@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } } .x { animation: blink 0.5s steps(2) infinite; }'
  );

  // (c) reduced-motion missing.
  expectCaught(
    'prefers-reduced-motion absent',
    (t) => (/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i.test(t) ? null : 'no reduced-motion media query'),
    'body { animation: drift 10s linear infinite; }'
  );

  // (d) shell without a skip link.
  expectCaught(
    'skip-link missing',
    (t) => {
      if (!/class="skip-link"/.test(t)) return 'no skip link';
      if (!/href="#main-content"/.test(t)) return 'skip link targets nothing';
      return null;
    },
    '<body><header>bar</header><main>content</main></body>'
  );

  // (e) a second act-atom source.
  expectCaught(
    'rogue act-atom source',
    (t) => (/act\s*:\s*['"]/.test(t) ? 'act atoms defined outside lib/nav' : null),
    "export const NAV_OTHER = [{ id: 'x', label: 'X', href: '/x', act: 'to' }]"
  );

  // (f) h4 in source.
  expectCaught('heading deeper than h3', (t) => (/<h4\b/.test(t) ? 'h4 present' : null), '<section><h4>Sub</h4></section>');

  // (f) rendered-page skip h2→h4 (the --dist leg algorithm).
  expectCaught(
    'heading skip',
    (t) => {
      const seq = [...t.matchAll(HEADING_RE)].map((m) => Number(m[1]));
      let prev = null;
      for (const lvl of seq) {
        if (prev !== null && lvl > prev + 1) return `skip h${prev}→h${lvl}`;
        prev = lvl;
      }
      return null;
    },
    '<h2>A</h2><p>x</p><h4>B</h4>'
  );

  // (f) rendered page starting at h2.
  expectCaught(
    'page first heading not h1',
    (t) => {
      const seq = [...t.matchAll(HEADING_RE)].map((m) => Number(m[1]));
      if (seq.length === 0) return 'no headings';
      return seq[0] !== 1 ? `first heading h${seq[0]}` : null;
    },
    '<h2>FAQ</h2><p>body</p>'
  );

  return catches;
}

/* ──────────────────────────────── run ───────────────────────────────────── */

if (ONLY_SELF_TEST) {
  const catches = negativeControls();
  const failed = catches.filter((c) => !c.caught);
  for (const c of catches) {
    console.log(`  ${c.caught ? 'PASS' : 'FAIL'}  negative control: ${c.name}${c.caught ? '' : ` — ${c.detail}`}`);
  }
  if (failed.length) {
    console.error(`check-neurodivergent: ${failed.length} negative control(s) not caught — the rule is not a sensor.`);
    process.exit(1);
  }
  console.log(`check-neurodivergent --self-test: ${catches.length}/${catches.length} planted violations caught`);
  process.exit(0);
}

if (RUN_DIST) {
  const problem = headingProblemsDist();
  if (problem) {
    console.error(`check-neurodivergent --dist: rendered heading hierarchy violations:\n  ${problem}`);
    process.exit(1);
  }
  console.log('check-neurodivergent --dist: rendered pages follow H1→H2→H3 with no skips and ≤3 levels');
  process.exit(0);
}

// Prebuild leg: source rules + (when dist is fresh) the rendered check.
const a = checkAccentCtas();
const c = checkMotion();
const d = checkSkipLink();
const e = checkNavSource();
const f = headingProblemsSrc();

rule('(a) one filled-accent CTA per viewport', !a, a);
rule('(c) no autoplay / no flashing / reduced-motion respected', !c, c);
rule('(d) skip-to-content link in the shell', !d, d);
rule('(e) NAV_ATOMS is the only nav source', !e, e);
rule('(f) heading hierarchy ≤3, no skips (source)', !f, f);

if (failures.length) {
  console.error(`check-neurodivergent: ${failures.length} violation(s):`);
  for (const f0 of failures) console.error(`  ${f0}`);
  console.error('  Manual item (b): consistent layout per page-type — reviewed by hand each wave (see docs/fix-plans/p31ca-neurodivergent-wcag-content.md).');
  process.exit(1);
}

console.log('check-neurodivergent: clean — accent-CTA rule, motion rule, skip link, nav source, heading levels (source) all pass');
console.log('  Manual item (b): consistent layout per page-type — reviewed by hand (data-align/data-cols/data-even contracts).');
console.log('  Rendered no-skip check runs postbuild (`--dist`).');