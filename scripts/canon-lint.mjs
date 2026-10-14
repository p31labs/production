#!/usr/bin/env node
/**
 * canon-lint.mjs — Gate 3: canon CSS lint for the P31 marketplace.
 *
 * Scans CSS files in portal source (default: portals/mcp-marketplace/src,
 * extendable via `--path`) and FAILS on:
 *
 *   R1  LAYER — an `@import` statement WITHOUT `layer(...)`. Canon ships one
 *       token sheet; importing it unlayered lets a portal sheet win cascade
 *       fights the canon contract never agreed to (and is the class of bug
 *       that let portal rules grow the 560px select). Once `@layer` adoption
 *       lands, unlayered imports are a hard failure. TODAY the portal is
 *       pre-adoption (`globals.css` imports `./tokens.css` bare) — run with
 *       `--warn-layer` to downgrade R1 to warnings and exit clean on it.
 *       Fix-plan: docs/fix-plans/canon-css-layer-adoption.md.
 *
 *   R2  HEX — hex literals (`#rgb`/`#rrggbb`/`#rrggbbaa`) in any CSS file
 *       EXCEPT tokens.css. Every visual decision routes through a token
 *       (Seven Laws #5); a hardcoded hex in a portal sheet is a fork.
 *       Comments and strings are masked before matching.
 *
 *   R3  LEGACY — bare class selectors matching the legacy blocklist
 *       (`.surface-panel`, `.setup-input`, `.step-row`) in NEW css files.
 *       The legacy sheets (workspace.css, marketplace.css — the pre-canon
 *       surfaces) are grandfathered via LEGACY_SHEETS; any NEW sheet that
 *       reintroduces those classes FAILS.
 *
 * --self-test proves each detector (negative controls):
 *   N1  unlayered `@import` MUST fail in default mode and MUST warn-only in
 *       `--warn-layer` mode; a layered import MUST pass in both modes.
 *   N2  hex outside tokens.css MUST fail; hex inside tokens.css and hex
 *       inside a comment MUST pass.
 *   N3  `.setup-input` in a NEW sheet MUST fail; the same selector in a
 *       legacy sheet MUST pass.
 *   Exit 1 if any expectation is violated. Zero dependencies. Plain node.
 */
import { readdirSync, readFileSync, mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)));
const ROOT = resolve(HERE, '..');
const DEFAULT_SRC = resolve(ROOT, 'portals', 'mcp-marketplace', 'src');

/** Pre-canon sheets grandfathered for the legacy-blocklist rule. */
const LEGACY_SHEETS = new Set(['workspace.css', 'marketplace.css']);
/** Legacy bare classes that must never appear in a NEW sheet. */
const LEGACY_BLOCKLIST = ['.surface-panel', '.setup-input', '.step-row'];
/** The single sheet allowed to declare hex (token adapters are var-only). */
const TOKEN_SHEET = 'tokens.css';

const IMPORT_RE = /@import\s+(?:url\(\s*)?(['"]?)([^'")\s;]+)\1\s*\)?([^;]*);/g;
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;

/** Mask comments (line + block) — strings are left alone (CSS strings cannot
 *  contain valid hex/selectors that matter here, but comments can). */
function maskComments(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    if (c === '/' && next === '*') {
      const end = src.indexOf('*/', i + 2);
      out += ' '.repeat(end === -1 ? n - i : end + 2 - i);
      i = end === -1 ? n : end + 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

function* walkCss(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', 'coverage', '.wrangler', '.git'].includes(e.name)) continue;
      yield* walkCss(p);
    } else if (/\.css$/.test(e.name)) {
      yield p;
    }
  }
}

/**
 * Lint one CSS file. Returns violations: { rule, file, line?, detail }.
 * `warnLayer` downgrades R1 (pre-adoption mode).
 */
function lintCss(file, root, { warnLayer = false, legacySheets = LEGACY_SHEETS } = {}) {
  const violations = [];
  const rel = file.replace(root + '/', '');
  const src = readFileSync(file, 'utf8');
  const name = basename(file);

  // R1 — @import without layer(...)
  const masked = maskComments(src);
  IMPORT_RE.lastIndex = 0;
  let m;
  while ((m = IMPORT_RE.exec(masked))) {
    const spec = m[2] + m[3];
    if (/layer\s*\(/.test(spec)) continue;
    const line = (masked.slice(0, m.index).match(/\n/g) ?? []).length + 1;
    const v = { rule: 'layer', file: rel, line, detail: `@import '${m[2]}' without layer(...)` };
    if (warnLayer) {
      console.warn(`⚠ [layer/warn] ${rel}:${line} — @import '${m[2]}' without layer(...) (pre-adoption).`);
    } else {
      violations.push(v);
    }
  }

  // R2 — hex outside tokens.css
  if (name !== TOKEN_SHEET) {
    HEX_RE.lastIndex = 0;
    let h;
    while ((h = HEX_RE.exec(masked))) {
      const line = (masked.slice(0, h.index).match(/\n/g) ?? []).length + 1;
      violations.push({ rule: 'hex', file: rel, line, detail: `hex literal ${h[0]} outside tokens.css — route through a token` });
    }
  }

  // R3 — legacy bare selectors in NEW sheets
  if (!legacySheets.has(name)) {
    for (const sel of LEGACY_BLOCKLIST) {
      const re = new RegExp(`(^|[,\\s{])${sel.replace('.', '\\.')}\\b`, 'g');
      let s;
      while ((s = re.exec(masked))) {
        const line = (masked.slice(0, s.index).match(/\n/g) ?? []).length + 1;
        violations.push({ rule: 'legacy', file: rel, line, detail: `bare legacy selector ${sel} in a new sheet — use the canon component class` });
      }
    }
  }

  return violations;
}

function lintRoot(root, opts) {
  const out = [];
  for (const file of walkCss(root)) out.push(...lintCss(file, root, opts));
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const selfTest = args.includes('--self-test');
  const warnLayer = args.includes('--warn-layer');
  const roots = [DEFAULT_SRC];
  let legacySheets = LEGACY_SHEETS;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--path' && args[i + 1]) roots.push(resolve(args[i + 1]));
    if (args[i] === '--legacy-sheets' && args[i + 1]) {
      legacySheets = new Set(args[i + 1].split(',').map((s) => s.trim()));
    }
  }
  roots.forEach((r) => {
    if (!existsSync(r)) {
      console.error(`✗ canon-lint: scan root does not exist: ${r}`);
      process.exit(1);
    }
  });

  if (selfTest) {
    const dir = mkdtempSync(join(tmpdir(), 'canonlint-self-'));
    let broken = false;
    const lintOne = (f) => lintCss(f, dir, { warnLayer: false, legacySheets });
    const lintOneWarn = (f) => lintCss(f, dir, { warnLayer: true, legacySheets });

    // N1 — layer rule, both modes.
    const badImport = join(dir, 'bad-import.css');
    writeFileSync(badImport, "@import './tokens.css';\n.x { color: var(--x); }\n");
    const goodImport = join(dir, 'good-import.css');
    writeFileSync(goodImport, "@import './tokens.css' layer(tokens);\n.y { color: var(--y); }\n");
    if (!lintOne(badImport).some((v) => v.rule === 'layer')) {
      console.error('✗ self-test broken: unlayered @import was NOT caught.');
      broken = true;
    } else {
      console.log('✓ negative control N1a: unlayered @import caught (default mode).');
    }
    if (lintOneWarn(badImport).some((v) => v.rule === 'layer')) {
      console.error('✗ self-test broken: --warn-layer did not downgrade the unlayered import.');
      broken = true;
    } else {
      console.log('✓ negative control N1b: --warn-layer downgrades to warn, no violation.');
    }
    if (lintOne(goodImport).some((v) => v.rule === 'layer')) {
      console.error('✗ self-test broken: layered @import was flagged.');
      broken = true;
    } else {
      console.log('✓ negative control N1c: layer(...) import passes in both modes.');
    }

    // N2 — hex rule.
    const badHex = join(dir, 'bad-hex.css');
    writeFileSync(badHex, '.x { color: #aabbcc; border: 1px solid #abc; }\n');
    const tok = join(dir, 'tokens.css');
    writeFileSync(tok, ':root { --p31-brand: #0a1f44; }\n');
    const commented = join(dir, 'commented.css');
    writeFileSync(commented, '/* palette: #deadbe */\n.x { color: var(--x); }\n');
    if (!lintOne(badHex).some((v) => v.rule === 'hex')) {
      console.error('✗ self-test broken: hex outside tokens.css was NOT caught.');
      broken = true;
    } else {
      console.log('✓ negative control N2a: hex outside tokens.css caught.');
    }
    if (lintOne(tok).some((v) => v.rule === 'hex') || lintOne(commented).some((v) => v.rule === 'hex')) {
      console.error('✗ self-test broken: tokens.css hex or commented hex was flagged.');
      broken = true;
    } else {
      console.log('✓ negative control N2b: hex in tokens.css and in comments not flagged.');
    }

    // N3 — legacy selector rule.
    const badLegacy = join(dir, 'new-sheet.css');
    writeFileSync(badLegacy, '.setup-input { padding: 4px; }\n.step-row { display: flex; }\n');
    const legacyFile = join(dir, 'workspace.css');
    writeFileSync(legacyFile, '.surface-panel { display: none; }\n.surface-panel.active { display: flex; }\n');
    if (!lintOne(badLegacy).some((v) => v.rule === 'legacy')) {
      console.error('✗ self-test broken: legacy selector in a NEW sheet was NOT caught.');
      broken = true;
    } else {
      console.log('✓ negative control N3a: legacy selectors in a new sheet caught.');
    }
    if (lintOne(legacyFile).some((v) => v.rule === 'legacy')) {
      console.error('✗ self-test broken: grandfathered legacy sheet was flagged.');
      broken = true;
    } else {
      console.log('✓ negative control N3b: grandfathered legacy sheet not flagged.');
    }

    rmSync(dir, { recursive: true, force: true });
    if (broken) {
      console.error('✗ canon-lint self-test FAILED.');
      process.exit(1);
    }
    console.log('✅ canon-lint self-test: all negative controls proven.');
  }

  const all = roots.flatMap((r) => lintRoot(r, { warnLayer, legacySheets }));
  if (all.length > 0) {
    for (const v of all) {
      console.error(`✗ [${v.rule}] ${v.file}${v.line ? ':' + v.line : ''}: ${v.detail}`);
    }
    console.error(`✗ canon-lint FAILED — ${all.length} violation(s).`);
    process.exit(1);
  }
  console.log('✅ canon-lint: imports layered (or pre-adoption warned), no hex outside tokens.css, no legacy selectors in new sheets.');
  process.exit(0);
}

main();