#!/usr/bin/env node
/**
 * raw-element-gate.mjs — Gate 2 for the P31 marketplace production hardening.
 *
 * Scans portal source (default: portals/mcp-marketplace/src, extendable via
 * `--path <dir>` which is scanned IN ADDITION to the default) and FAILS on
 * raw `<select>`, `<input>`, `<textarea>` elements NOT rendered by a canon
 * component.
 *
 * Why: a raw control bypasses the canon contract (Seven Laws #2/#6). The
 * 560px-tall marketplace select was a raw <select className="setup-input">
 * rendered directly in a surface — nothing in canon had its geometry. This
 * gate is the static half of that sensor; the rendered half is
 * render-gate.mjs.
 *
 * Rules:
 *   R1  any `<select>`, `<input>`, or `<textarea>` JSX element outside the
 *       allowlist FAILS. Canon controls are capitalized components
 *       (<Select/>, <Input/>, <TextArea/>) and are not matched.
 *   Detection is comment- and string-aware: `//`, `/* *​/`, and quoted spans
 *   (including template literals) are masked before matching, so a raw
 *   element inside a string or a doc comment does not trip the gate.
 *   Line numbers are reported from the ORIGINAL file via a code-position
 *   mask (stripped text is never line-numbered).
 *
 * Allowlist: ALLOW_FILES lists scan-root-relative paths that MAY render raw
 * controls because the file IS the canon adapter for this portal. Today the
 * portal has no adapter (canon lives in node_modules, which is never
 * scanned), so the allowlist is empty — any raw control in portal source is
 * a violation. When the portal grows an adapter file (e.g. a thin wrapper
 * that composes canon inputs), add its path here.
 *
 * --self-test proves the detector (negative controls):
 *   N1  a fixture with a raw <select> MUST be flagged (exit expectation 1)
 *   N2  a fixture using canon <Select/>/<Input/>/<TextArea/> MUST be clean
 *   N3  a raw element inside a string literal ('<select>') MUST NOT be
 *       flagged (proves comment/string masking)
 *   Exit 1 if any expectation is violated. Zero dependencies. Plain node.
 */
import { readdirSync, readFileSync, mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)));
const ROOT = resolve(HERE, '..');
const DEFAULT_SRC = resolve(ROOT, 'portals', 'mcp-marketplace', 'src');

/** Files allowed to render raw controls (they are the canon adapter). */
const ALLOW_FILES = new Set([
  // 'src/components/CanonAdapter.tsx',  // ← add adapter paths here
]);

/** Source file extensions scanned for JSX control elements. */
const EXT_RE = /\.(tsx|jsx|ts|js)$/;

/**
 * Mask comments and string literals, returning an array of [start, end)
 * "live code" spans. Regex matching for raw elements must only count hits
 * whose start position falls inside a live span.
 *
 * Quote handling is JSX-aware by heuristic: a `'`/`"` only STARTS a string
 * when the previous non-whitespace char is punctuation/operator (or the
 * file start) — an apostrophe after a letter is JSX prose ("isn't") and
 * stays live. This prevents an apostrophe from swallowing the rest of a
 * file. Template literals are masked whole. Known limits (accepted): regex
 * literals are treated as code; strings whose delimiter follows a letter
 * (`return'x'`) are treated as code — neither hides a real raw element.
 */
const STRING_START_PREV = new Set('=(,{[:;!?&|+-*/%^~<>'.split(''));
function codeSpans(src) {
  const spans = [];
  let i = 0;
  const n = src.length;
  let spanStart = 0;
  const push = (end) => {
    if (end > spanStart) spans.push([spanStart, end]);
  };
  const prevNonWs = (at) => {
    let k = at - 1;
    while (k >= 0 && /\s/.test(src[k])) k -= 1;
    return k < 0 ? '\0' : src[k];
  };
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    // Line comment
    if (c === '/' && next === '/') {
      push(i);
      const nl = src.indexOf('\n', i);
      i = nl === -1 ? n : nl + 1;
      spanStart = i;
      continue;
    }
    // Block comment
    if (c === '/' && next === '*') {
      push(i);
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      spanStart = i;
      continue;
    }
    // Quoted string — only when a string is syntactically possible here.
    if ((c === '"' || c === "'") && (prevNonWs(i) === '\0' || STRING_START_PREV.has(prevNonWs(i)))) {
      push(i);
      i += 1;
      while (i < n) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === c) { i += 1; break; }
        i += 1;
      }
      spanStart = i;
      continue;
    }
    // Template literal — masked whole (${} expressions included).
    if (c === '`') {
      push(i);
      i += 1;
      while (i < n) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '`') { i += 1; break; }
        i += 1;
      }
      spanStart = i;
      continue;
    }
    i += 1;
  }
  push(n);
  return spans;
}

function inCode(spans, pos) {
  // Spans are sorted and non-overlapping; binary search.
  let lo = 0;
  let hi = spans.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [s, e] = spans[mid];
    if (pos < s) hi = mid - 1;
    else if (pos >= e) lo = mid + 1;
    else return true;
  }
  return false;
}

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', 'coverage', '.wrangler', '.git'].includes(e.name)) continue;
      yield* walk(p);
    } else if (EXT_RE.test(e.name)) {
      yield p;
    }
  }
}

const RAW_RE = /<(?=(select|input|textarea)\b)/g;

/** Scan one file; returns { file, rel, line, tag } violations. */
function scanFile(file, root) {
  const violations = [];
  const rel = file.replace(root + '/', '');
  if (ALLOW_FILES.has(rel)) return violations;
  const src = readFileSync(file, 'utf8');
  const spans = codeSpans(src);
  RAW_RE.lastIndex = 0;
  let m;
  while ((m = RAW_RE.exec(src))) {
    if (!inCode(spans, m.index)) continue;
    const before = src.slice(0, m.index);
    const line = (before.match(/\n/g) ?? []).length + 1;
    const tag = m[1];
    violations.push({ file: rel, line, tag });
  }
  return violations;
}

/** Scan one root; returns { file, rel, line, tag } violations. */
function scanRoot(root) {
  const violations = [];
  for (const file of walk(root)) violations.push(...scanFile(file, root));
  return violations;
}

function main() {
  const args = process.argv.slice(2);
  const selfTest = args.includes('--self-test');
  const roots = [DEFAULT_SRC];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--path' && args[i + 1]) roots.push(resolve(args[i + 1]));
  }
  roots.forEach((r) => {
    if (!existsSync(r)) {
      console.error(`✗ raw-element-gate: scan root does not exist: ${r}`);
      process.exit(1);
    }
  });

  if (selfTest) {
    const dir = mkdtempSync(join(tmpdir(), 'reg-self-'));
    let broken = false;

    // N1 — a raw <select> MUST be flagged.
    const raw = join(dir, 'RawSelect.tsx');
    writeFileSync(raw, 'export function Bad() {\n  return (\n    <select aria-label="x">\n      <option>a</option>\n    </select>\n  )\n}\n');
    const rawHits = scanFile(raw, dir);
    if (rawHits.length === 0) {
      console.error('✗ self-test broken: raw <select> was NOT caught.');
      broken = true;
    } else {
      console.log(`✓ negative control N1: raw <select> caught (${rawHits.length} flag, ${rawHits[0].file}:${rawHits[0].line}).`);
    }

    // N2 — canon components MUST be clean.
    const canon = join(dir, 'CanonForm.tsx');
    writeFileSync(canon, 'export function Good() {\n  return (\n    <div>\n      <Select aria-label="s" />\n      <Input aria-label="i" />\n      <TextArea aria-label="t" />\n    </div>\n  )\n}\n');
    const canonHits = scanFile(canon, dir);
    if (canonHits.length !== 0) {
      console.error(`✗ self-test broken: canon components flagged as raw (${canonHits.length}).`);
      broken = true;
    } else {
      console.log('✓ negative control N2: canon <Select/>/<Input/>/<TextArea/> not flagged.');
    }

    // N3 — a raw element inside a string MUST NOT be flagged.
    const str = join(dir, 'StringTrap.tsx');
    writeFileSync(str, 'export function Trap() {\n  const example = "<select><option>x</option></select>";\n  const note = `raw <input> inside a template literal`;\n  /* <textarea> in a comment */\n  return <pre>{example}{note}</pre>;\n}\n');
    const strHits = scanFile(str, dir);
    if (strHits.length !== 0) {
      console.error(`✗ self-test broken: string/comment <select> flagged (${strHits.length}).`);
      broken = true;
    } else {
      console.log('✓ negative control N3: raw elements inside strings/comments not flagged.');
    }

    rmSync(dir, { recursive: true, force: true });
    if (broken) {
      console.error('✗ raw-element-gate self-test FAILED.');
      process.exit(1);
    }
    console.log('✅ raw-element-gate self-test: all negative controls proven.');
  }

  const all = roots.flatMap((r) => scanRoot(r));
  if (all.length > 0) {
    for (const v of all) {
      console.error(`✗ [raw-control] ${v.file}:${v.line} — raw <${v.tag}> not rendered by a canon component.`);
    }
    console.error(`✗ raw-element-gate FAILED — ${all.length} raw control(s). Replace with canon <Select/>/<Input/>/<TextArea/>.`);
    process.exit(1);
  }
  console.log('✅ raw-element-gate: no raw <select>/<input>/<textarea> outside the canon adapter allowlist.');
  process.exit(0);
}

main();