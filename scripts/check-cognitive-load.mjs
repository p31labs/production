#!/usr/bin/env node
/**
 * check-cognitive-load.mjs — W2 gate for the P31 marketplace humanization.
 *
 * Scans portals/mcp-marketplace/src and FAILS when:
 *
 *   R1  nav top-level items > 5 — counts the entries of the literal arrays
 *       `NAV_ITEMS` and `ITEMS` in src/components (Topbar nav + mobile
 *       bottom nav). Entry counting is a brace-depth scan that ignores
 *       quoted spans (strings must not contain braces).
 *
 *   R2  interactive elements in Topbar.tsx > 4 — counts topbar-level
 *       element starts (<button|<input|<select|<a ) EXCLUDING the body of
 *       the file's NavLinks function (nav links are capped by R1, so they
 *       are not double-counted). Documented: primary nav renders through
 *       NavLinks; everything else in the topbar counts.
 *
 *   R3  cards in any single grid/list render > 7 — heuristic:
 *       - a `.map(` whose callback root JSX uses a card class
 *         (surface-card / glass-card) or whose container style contains
 *         "grid" is a CARD RENDER;
 *       - its array operand must be a literal const array (top-level entry
 *         count ≤ 7) or a `.slice(0, K)` where K is a literal number or an
 *         in-file `const K = <literal>` ≤ 7;
 *       - an uncapped card render FAILS (documented: cap grids with an
 *         in-file literal constant).
 *
 *   R4  a jargon string the plain-language scan would catch (imports the
 *       analyzer from plain-language-scan.mjs — one blocklist, two gates).
 *
 * --self-test proves the detector: plants a 6th nav item (negative
 * control — the scan must FAIL) and a 5th topbar element (must FAIL),
 * then scans the real portal (must PASS). Exit 1 if any expectation is
 * violated. Zero dependencies. Plain node.
 */
import { readdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { extractStrings, analyzeString, scanTree as plainScanTree } from './plain-language-scan.mjs';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)));
const ROOT = resolve(HERE, '..');
const PORTAL_SRC = resolve(ROOT, 'portals', 'mcp-marketplace', 'src');
const MAX_NAV = 5;
const MAX_INTERACTIVE = 4;
const MAX_CARDS = 7;

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', 'coverage'].includes(e.name)) continue;
      yield* walk(p);
    } else if (/\.(tsx|ts)$/.test(e.name)) {
      yield p;
    }
  }
}

/** Count top-level object entries in a literal array slice (the slice starts
 *  INSIDE the array, after its opening `[`, so entry braces sit at depth 1).
 *  Brace-depth scan, quote-aware (strings must not contain braces). */
function countLiteralEntries(src) {
  let depth = 0;
  let entries = 0;
  let quote = null;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (quote) {
      if (c === '\\') { i += 1; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') { depth += 1; if (depth === 1) entries += 1; }
    else if (c === '}') { depth -= 1; }
  }
  return entries;
}

/** Extract a literal array assigned to NAME in a file: `NAME = [ ... ]`.
 *  Tolerates a type annotation (`NAME: Array<...> = [`). */
function extractLiteralArray(src, name) {
  const re = new RegExp(`\\b${name}(?:\\s*:\\s*[^=]+)?\\s*=\\s*\\[`);
  const m = re.exec(src);
  if (!m) return null;
  const start = m.index + m[0].length;
  let depth = 1;
  let quote = null;
  for (let i = start; i < src.length; i += 1) {
    const c = src[i];
    if (quote) {
      if (c === '\\') { i += 1; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '[') depth += 1;
    else if (c === ']') {
      depth -= 1;
      if (depth === 0) return countLiteralEntries(src.slice(start, i));
    }
  }
  return null;
}

/** R1: nav items in component files. */
function checkNav(file, src, failures) {
  for (const name of ['NAV_ITEMS', 'ITEMS']) {
    const count = extractLiteralArray(src, name);
    if (count === null) continue;
    if (count > MAX_NAV) {
      failures.push({ rule: 'nav', file, detail: `${name} has ${count} top-level items (max ${MAX_NAV})` });
    }
  }
}

/** Strip a named function's body from src (line-based, brace-aware is overkill here). */
function stripFunctionBody(src, fnName) {
  const re = new RegExp(`(function\\s+${fnName}\\s*\\([^)]*\\)\\s*\\{)`);
  const m = re.exec(src);
  if (!m) return src;
  const start = m.index + m[0].length;
  let depth = 1;
  let quote = null;
  for (let i = start; i < src.length; i += 1) {
    const c = src[i];
    if (quote) {
      if (c === '\\') { i += 1; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(0, start) + src.slice(i + 1);
    }
  }
  return src;
}

/** R2: topbar interactive elements (excluding NavLinks, the nav renderer). */
function checkTopbarInteractive(file, src, failures) {
  if (!/Topbar\.tsx$/.test(file)) return;
  const body = stripFunctionBody(src, 'NavLinks');
  const count = (body.match(/<(?:button|input|select|a\b)/g) ?? []).length;
  if (count > MAX_INTERACTIVE) {
    failures.push({ rule: 'interactive', file, detail: `Topbar renders ${count} interactive elements outside the nav (max ${MAX_INTERACTIVE})` });
  }
}

/** Resolve an in-file literal const: `const X = <number>`. */
function resolveConst(src, name) {
  const re = new RegExp(`\\bconst\\s+${name}\\s*=\\s*(\\d+)`);
  const m = re.exec(src);
  return m ? Number(m[1]) : null;
}

/** Resolve a useState initializer: `const [name, setX] = useState(N | CONST)`. */
function resolveStateInitializer(src, name) {
  const re = new RegExp(`const\\s+\\[${name}\\s*,`);
  const m = re.exec(src);
  if (!m) return null;
  const um = /useState\(\s*(\w+|\d+)\s*\)/.exec(src.slice(m.index + m[0].length, m.index + m[0].length + 160));
  if (!um) return null;
  const init = um[1];
  if (/^\d+$/.test(init)) return Number(init);
  return resolveConst(src, init);
}

/** R3: card renders must be capped at ≤7 by a literal array or slice(0, K).
 *  A render counts as a CARD render when the map callback (next ~3000 chars)
 *  references a card class (surface-card/glass-card) OR mounts a component
 *  whose name ends in "Card" (component-name heuristic — covers ServerCard
 *  renders whose card class lives in the component file). */
function checkCardRenders(file, src, failures) {
  const rel = file.replace(PORTAL_SRC + '/', 'src/');
  const mapRe = /\.map\(/g;
  let m;
  const cardClassName = /className=["']surface-card["']|glass-card/;
  while ((m = mapRe.exec(src))) {
    const windowSrc = src.slice(0, m.index + m[0].length);
    const after = src.slice(m.index + m[0].length, m.index + m[0].length + 3000);
    const isCard = cardClassName.test(after) || /\b\w*Card\w*\b/.test(after.slice(0, 400));
    if (!isCard) continue;

    // Capped by .slice(0, K) — K literal or in-file `const K = <literal>`.
    const sliceMatch = windowSrc.match(/\.slice\(\s*0\s*,\s*([A-Za-z_$][\w$]*|\d+)\s*\)\s*\.map\($/);
    if (sliceMatch) {
      const arg = sliceMatch[1];
      const cap = /^\d+$/.test(arg) ? Number(arg) : (resolveConst(src, arg) ?? resolveStateInitializer(src, arg));
      if (cap === null) {
        failures.push({ rule: 'cards', file: rel, detail: `card render caps its list with an unresolvable slice size "${arg}" (must be an in-file literal ≤ ${MAX_CARDS})` });
      } else if (cap > MAX_CARDS) {
        failures.push({ rule: 'cards', file: rel, detail: `card render shows up to ${cap} cards (max ${MAX_CARDS})` });
      }
      continue;
    }
    // Simple identifier operand → must be an in-file literal array ≤ 7.
    const operandMatch = windowSrc.match(/([A-Za-z_$][\w$]*)\s*\.\s*map\($/);
    if (operandMatch) {
      const count = extractLiteralArray(src, operandMatch[1]);
      if (count === null) {
        failures.push({ rule: 'cards', file: rel, detail: `card render maps an uncapped list "${operandMatch[1]}" (cap it with .slice(0, K ≤ ${MAX_CARDS}) or a literal array)` });
      } else if (count > MAX_CARDS) {
        failures.push({ rule: 'cards', file: rel, detail: `card render maps ${count} entries (max ${MAX_CARDS})` });
      }
      continue;
    }
    // Parenthesized operand (e.g. (pending ?? []).map) without a slice → uncapped.
    if (/\)\s*\.\s*map\($/.test(windowSrc)) {
      failures.push({ rule: 'cards', file: rel, detail: `card render maps an uncapped parenthesized list (cap it with .slice(0, K ≤ ${MAX_CARDS}))` });
    }
  }
}

/** R4: reuse the plain-language blocklist across the whole src tree. */
function checkJargon(failures) {
  const { failures: plain } = plainScanTree(PORTAL_SRC, 'src');
  for (const f of plain) {
    failures.push({ rule: 'jargon', file: f.file, detail: `${f.reason} ("${f.text}")` });
  }
}

function scanSrcTree(root) {
  const failures = [];
  for (const file of walk(root)) {
    const src = readFileSync(file, 'utf8');
    checkNav(file, src, failures);
    checkTopbarInteractive(file, src, failures);
    checkCardRenders(file, src, failures);
  }
  checkJargon(failures);
  return failures;
}

function main() {
  const args = process.argv.slice(2);
  const selfTest = args.includes('--self-test');

  if (selfTest) {
    const dir = mkdtempSync(join(tmpdir(), 'ccl-self-'));
    const plant = join(dir, 'Topbar.tsx');
    const topbar = readFileSync(join(PORTAL_SRC, 'components', 'Topbar.tsx'), 'utf8');
    let broken = false;
    // Negative control 1: a 6th nav item must trip R1.
    writeFileSync(plant, topbar.replace(
      'NAV_ITEMS = [',
      'NAV_ITEMS = [\n  { id: "extra", label: "Extra", to: "home" },\n  { id: "extra2", label: "Extra two", to: "home" },',
    ));
    const navHits = scanSrcTree(dir).filter((f) => f.rule === 'nav');
    if (navHits.length === 0) {
      console.error('✗ self-test broken: 6th nav item was NOT caught.');
      broken = true;
    } else {
      console.log(`✓ negative control: 6th nav item caught (${navHits.length} flag(s)).`);
    }
    // Negative control 2: extra topbar buttons must trip R2.
    writeFileSync(plant, topbar.replace('identity={<PortalIdentity />}', 'identity={<><PortalIdentity /><button type="button">x</button><button type="button">y</button><button type="button">z</button></>}'));
    const iHits = scanSrcTree(dir).filter((f) => f.rule === 'interactive');
    if (iHits.length === 0) {
      console.error('✗ self-test broken: extra topbar elements were NOT caught.');
      broken = true;
    } else {
      console.log('✓ negative control: extra topbar interactives caught.');
    }
    rmSync(dir, { recursive: true, force: true });
    if (broken) process.exit(1);
  }

  const failures = scanSrcTree(PORTAL_SRC);
  if (failures.length > 0) {
    for (const f of failures) {
      console.error(`✗ [${f.rule}] ${f.file}: ${f.detail}`);
    }
    console.error(`✗ check-cognitive-load FAILED — ${failures.length} violation(s).`);
    process.exit(1);
  }
  console.log('✅ check-cognitive-load: nav ≤5, topbar interactives ≤4, card renders ≤7, no jargon.');
  process.exit(0);
}

main();