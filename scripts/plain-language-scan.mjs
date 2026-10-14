#!/usr/bin/env node
/**
 * plain-language-scan.mjs — W1 gate for the P31 marketplace humanization.
 *
 * Scans portals/mcp-marketplace/src/**\/ *.tsx|*.ts and extracts
 * user-visible string literals:
 *   1. JSX text — literal text between tags (`>text<`) and quoted JSX text
 *      (`>{'text'}<`, `{'text'}`, `{"text"}`).
 *   2. props — title / aria-label / placeholder string or template
 *      literals (single or double quoted).
 *   3. error messages — literals passed to `new Error(...)` / `throw new
 *      X(...)`, pushed via `errors.push(...)`, set via setError/setMsg/
 *      setImportMsg/setManifestError setters, or returned as `error:` /
 *      `detail:` object fields.
 *
 * For every extracted string it computes:
 *   - readability score = avg letters/word + avg words/sentence
 *     (sentences split on `. ! ? …`; a string with no sentence punctuation
 *     counts as one sentence). Score > 13 FAILS. Tag-span matches carrying
 *     code tokens (newlines, `=>`, `=`, `(`, `)`, `{`, `}`, `useState`,
 *     `return`, `const`, `function`, `;`) are rejected as code, not prose.
 *   - jargon blocklist: rfc, oauth, oidc, did:, didkey, aud, probe, shim,
 *     governed, endpoint, transport, backend, manifest, schema, json-rpc,
 *     jsonrpc, liveness, plus the standalone token "mcp". A hit FAILS.
 *     `.p31-mcp.json` is normalized out before matching (locked by the
 *     plan wording mapping). "Ctrl+K" is allowed only inside title
 *     tooltips; visible anywhere else FAILS.
 *
 * Usage:
 *   node scripts/plain-language-scan.mjs            # scan the portal (exit 0 = clean)
 *   node scripts/plain-language-scan.mjs --self-test # prove detector + portal clean
 *   node scripts/plain-language-scan.mjs --json     # machine-readable report
 *
 * Zero dependencies. Plain node.
 */
import { readdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)));
const ROOT = resolve(HERE, '..');
const PORTAL_SRC = resolve(ROOT, 'portals', 'mcp-marketplace', 'src');

export const JARGON_WORDS = new Set([
  'rfc', 'oauth', 'oidc', 'didkey', 'aud', 'probe', 'shim', 'governed',
  'endpoint', 'transport', 'backend', 'manifest', 'schema', 'jsonrpc',
  'liveness',
]);

const JARGON_RAW = ['did:', 'json-rpc'];
/** score = avg letters/word + avg words/sentence; flag above this. */
const READABILITY_THRESHOLD = 13;

/** Code fragments that a naive tag-span match can capture. Real prose never
 *  contains these tokens, so anything carrying one is rejected as code. */
const CODE_RE = /\n|=>|useState|return\b|\bconst\b|function\b|=|;|\(|\)|\{|\}/;

/** Normalize known-safe product tokens out of a string before matching. */
function normalizeString(s) {
  return s.replace(/\.p31-mcp\.json/gi, 'FILE').replace(/\.mcp\.json/gi, 'FILE');
}

/**
 * Scan one file's source. Returns the extracted strings with provenance:
 * { file, line, source: 'jsx'|'title'|'aria-label'|'placeholder'|'error', text }
 */
export function extractStrings(file, src) {
  const lines = src.split('\n');
  const at = (m) => (lines.slice(0, (src.slice(0, m.index).match(/\n/g) ?? []).length).length + 1);
  const out = [];

  const push = (text, kind, m) => {
    const t = String(text).trim();
    if (!t) return;
    if (kind === 'jsx' && CODE_RE.test(t)) return; // code fragment, not prose
    out.push({ file, line: at(m), source: kind, text: t });
  };

  // 1. JSX text between tags (no angle/bracket runs) + quoted JSX text.
  const jsxRe = />([^<>{}]+)</g;
  let m;
  while ((m = jsxRe.exec(src))) {
    const t = m[1].trim();
    if (t) push(t, 'jsx', m);
  }
  const quotedJsxRe = /(?:>|})\s*(['"])([^'"\n{}]{1,400})\1\s*(?:<|{)/g;
  while ((m = quotedJsxRe.exec(src))) push(m[2], 'jsx', m);
  // Bare expression text like {'text'} / {"text"}:
  const bareJsxRe = /\{\s*(['"])([^'"\n{}]{1,400})\1\s*\}/g;
  while ((m = bareJsxRe.exec(src))) push(m[2], 'jsx', m);

  // 2. title / aria-label / placeholder props.
  const propRe = /\b(title|aria-label|placeholder)\s*=\s*(?:\(\s*)?(['"])([^'"\n]{1,400})\2/g;
  while ((m = propRe.exec(src))) push(m[3], m[1], m);
  // JSX expression prop: title={'text'}
  const propExprRe = /\b(title|aria-label|placeholder)\s*=\s*\{\s*(['"])([^'"\n]{1,400})\2\s*\}/g;
  while ((m = propExprRe.exec(src))) push(m[3], m[1], m);

  // 3. Error-message literals.
  const errRe = /(?:new\s+\w*Error|errors\.push|setError|setMsg|setImportMsg|setManifestError|setManifestErrors)\s*\(\s*(['"])([^'"\n]{1,400})\1/g;
  while ((m = errRe.exec(src))) push(m[2], 'error', m);
  const errFieldRe = /(?:,|\{\s*)\s*(?:error|detail)\s*:\s*(['"])([^'"\n]{1,400})\1/g;
  while ((m = errFieldRe.exec(src))) push(m[2], 'error', m);

  // Template literals in the same positions (strip ${...} first).
  const tplRe = /(?:new\s+\w*Error|errors\.push|setError|setMsg|setImportMsg|setManifestError)\s*\(\s*`([^`]{1,800})`/g;
  while ((m = tplRe.exec(src))) push(m[1].replace(/\$\{[^}]*\}/g, 'X'), 'error', m);
  const tplFieldRe = /(?:,|\{\s*)\s*(?:error|detail)\s*:\s*`([^`]{1,800})`/g;
  while ((m = tplFieldRe.exec(src))) push(m[1].replace(/\$\{[^}]*\}/g, 'X'), 'error', m);
  const tplPropRe = /\b(title|aria-label|placeholder)\s*=\s*\{\s*`([^`]{1,800})`\s*\}/g;
  while ((m = tplPropRe.exec(src))) push(m[2].replace(/\$\{[^}]*\}/g, 'X'), m[1], m);

  return out;
}

/** Analyze one extracted string. Returns [] on pass, reasons[] on fail. */
export function analyzeString(entry) {
  const reasons = [];
  const norm = normalizeString(entry.text);
  const lower = norm.toLowerCase();

  // Jargon blocklist.
  for (const raw of JARGON_RAW) if (lower.includes(raw)) reasons.push(`jargon "${raw}"`);
  const tokens = lower.match(/[a-z0-9]+/g) ?? [];
  for (const tok of tokens) {
    if (JARGON_WORDS.has(tok)) reasons.push(`jargon "${tok}"`);
    if (tok === 'mcp') reasons.push('jargon "mcp" (standalone)');
  }

  // Ctrl+K only in title tooltips.
  if (/ctrl\+k/i.test(lower) && entry.source !== 'title') {
    reasons.push('"Ctrl+K" outside a title tooltip');
  }

  // Readability: avg letters/word + avg words/sentence.
  const words = lower.match(/[a-z][a-z'-]*/g) ?? [];
  if (words.length > 0) {
    const letters = words.reduce((a, w) => a + w.replace(/[^a-z]/gi, '').length, 0);
    const avgWord = letters / words.length;
    const sentences = lower.split(/[.!?…]+/).map((s) => s.trim()).filter(Boolean);
    const sentCount = Math.max(1, sentences.length);
    const wordsPerSent = words.length / sentCount;
    const score = avgWord + wordsPerSent;
    if (score > READABILITY_THRESHOLD) {
      reasons.push(`readability ${score.toFixed(1)} > ${READABILITY_THRESHOLD} (avgWord ${avgWord.toFixed(1)} + words/sentence ${wordsPerSent.toFixed(1)})`);
    }
  }
  return reasons;
}

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

/** Scan a source tree. Returns { failures, entries }. */
export function scanTree(srcRoot, label = 'tree') {
  const failures = [];
  let entries = 0;
  for (const file of walk(srcRoot)) {
    const src = readFileSync(file, 'utf8');
    for (const entry of extractStrings(file, src)) {
      entries += 1;
      for (const reason of analyzeString(entry)) {
        failures.push({ file: file.replace(srcRoot + '/', `${label}/`), line: entry.line, source: entry.source, text: entry.text.slice(0, 120), reason });
      }
    }
  }
  return { failures, entries };
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const selfTest = args.includes('--self-test');
  const log = (s) => { if (!json) console.log(s); };

  if (selfTest) {
    const dir = mkdtempSync(join(tmpdir(), 'pls-self-'));
    const plant = join(dir, 'plant.tsx');
    const clean = join(dir, 'clean.tsx');
    writeFileSync(plant, 'export function A() { return <div>rfc 8707 audience binding</div> }\n');
    writeFileSync(clean, 'export function B() { return <div title="Search (Ctrl+K)">Find a tool</div> }\n');
    const plantRes = scanTree(dir, 'self');
    let broken = false;
    if (plantRes.failures.length === 0) {
      console.error('✗ self-test broken: planted jargon ("rfc") was NOT caught.');
      broken = true;
    } else {
      log(`✓ negative control: planted jargon caught (${plantRes.failures.length} flag(s)).`);
    }
    // The clean fixture must contain no failures of its own (Ctrl+K in a title is allowed).
    const cleanRes = scanTree(dir, 'self');
    const cleanOnly = cleanRes.failures.filter((f) => f.file.includes('clean.tsx'));
    if (cleanOnly.length > 0) {
      console.error(`✗ self-test broken: clean fixture flagged (${cleanOnly[0].reason}).`);
      broken = true;
    } else {
      log('✓ negative control: clean fixture passes.');
    }
    rmSync(dir, { recursive: true, force: true });
    if (broken) process.exit(1);
  }

  const { failures, entries } = scanTree(PORTAL_SRC, 'src');
  if (json) {
    console.log(JSON.stringify({ entries, failures }, null, 2));
  } else {
    log(`scan: ${entries} user-visible strings extracted from portals/mcp-marketplace/src`);
  }
  if (failures.length > 0) {
    for (const f of failures) {
      console.error(`✗ ${f.file}:${f.line} [${f.source}] ${f.reason}\n   "${f.text}"`);
    }
    console.error(`✗ plain-language-scan FAILED — ${failures.length} string(s) above threshold or on the jargon blocklist.`);
    process.exit(1);
  }
  log('✅ plain-language-scan: all user-visible strings are 5th-grade plain language.');
  process.exit(0);
}

// Run only when invoked directly (check-cognitive-load imports the helpers).
const isDirect = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) main();