#!/usr/bin/env node
/* P31-HEADER
 * id: p31_c_mobile_first_audit_20261011_v1.0
 * type: gate
 * component: design-workflow/C-mobile-audit
 * status: live
 * retention: keep-forever
 * created: 2026-10-11T00:00:00Z
 * owner: half-sour
 */

// P31 Workstream C — mobile-first static audit gate.
// Zero dependencies. Node 24 ESM. Exit 1 if ANY check FAILs (fail closed).
//
//   node mobile-first-audit.mjs <css-file> [--label name]
//
// Checks (runbook WORKSTREAM C §7, research basis §2 items 3–5):
//   clamp-rem                  every clamp(...) must contain a rem term (WCAG F94: pure vw breaks zoom)
//   viewport-units             literal `100vh` forbidden (svh/dvh only)
//   safe-area                  fixed/sticky/bottom-chrome requires env(safe-area-inset-*)
//   breakpoint-hardcode        raw-px min-width/max-width media queries forbidden (rem or token var)
//   touch-target-static        a/button/[role=button]/input < 44px: FAIL under (pointer:coarse)/(hover:none),
//                              WARN outside pointer blocks (WCAG 2.5.5 / Apple HIG 44px)
//   horizontal-overflow-static width: <n>px with n>320 outside a min-width media query = WARN (320px litmus)
//
// Evidence rule (P31 law 9): every line cites file:line.

import { readFileSync } from 'node:fs';

// ---------------------------------------------------------------- CLI

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log('usage: node mobile-first-audit.mjs <css-file> [--label name]');
  process.exit(args.length === 0 ? 1 : 0);
}
const file = args[0];
let label = null;
const li = args.indexOf('--label');
if (li !== -1 && args[li + 1] !== undefined) label = args[li + 1];

let raw;
try {
  raw = readFileSync(file, 'utf8');
} catch (e) {
  console.error(`mobile-first-audit: cannot read ${file}: ${e.message}`);
  process.exit(1);
}

// ---------------------------------------------------------------- helpers

// Strip comments but preserve length + newlines so offsets map to real lines.
const clean = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

const lineStarts = [0];
for (let i = 0; i < clean.length; i++) if (clean[i] === '\n') lineStarts.push(i + 1);

function lineAt(off) {
  let lo = 0, hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineStarts[mid] <= off) lo = mid; else hi = mid - 1;
  }
  return lo + 1;
}

function findMatchingParen(s, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") {
      const q = c;
      i++;
      while (i < s.length && s[i] !== q) { if (s[i] === '\\') i++; i++; }
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') { depth--; if (depth === 0) return i; }
  }
  return s.length - 1;
}

const findings = [];
function add(check, severity, message, line) {
  findings.push({ check, severity, message, line });
}

// ---------------------------------------------------------------- 1. clamp-rem

const clampOcc = [];
for (const m of clean.matchAll(/clamp\(/gi)) {
  const open = m.index + m[0].length - 1;
  const close = findMatchingParen(clean, open);
  const body = clean.slice(open + 1, close);
  clampOcc.push({ body, line: lineAt(m.index), hasRem: /(?:\d+(?:\.\d+)?|\.\d+)\s*rem/i.test(body) });
}
for (const c of clampOcc) {
  if (!c.hasRem) {
    add('clamp-rem', 'FAIL',
      `clamp(${c.body.replace(/\s+/g, ' ')}) has no rem term — pure-vw preferred value breaks browser zoom (WCAG F94)`,
      c.line);
  }
}

// ---------------------------------------------------------------- 2. viewport-units

const vhMatches = [];
for (const m of clean.matchAll(/100vh\b/g)) vhMatches.push({ line: lineAt(m.index) });
for (const v of vhMatches) {
  add('viewport-units', 'FAIL', 'literal `100vh` — use 100svh / 100dvh (mobile URL bar / dynamic viewport safe)', v.line);
}
const dynVh = [...clean.matchAll(/100[dls]vh/g)].map((m) => lineAt(m.index));

// ---------------------------------------------------------------- 3. safe-area

const fixedMatches = [];
for (const m of clean.matchAll(/position\s*:\s*(fixed|sticky)/gi)) {
  fixedMatches.push({ line: lineAt(m.index), what: m[1] });
}
const chromeMatches = [];
for (const m of clean.matchAll(/bottom-(?:bar|nav)|tab-bar/gi)) {
  chromeMatches.push({ line: lineAt(m.index), what: m[0] });
}
const safeAreaMatches = [...clean.matchAll(/env\s*\(\s*safe-area-inset/gi)]
  .map((m) => ({ line: lineAt(m.index) }));

if ((fixedMatches.length > 0 || chromeMatches.length > 0) && safeAreaMatches.length === 0) {
  for (const t of fixedMatches) {
    add('safe-area', 'FAIL', `position:${t.what} without env(safe-area-inset-*) anywhere in file`, t.line);
  }
  for (const t of chromeMatches) {
    add('safe-area', 'FAIL', `bottom-chrome selector "${t.what}" without env(safe-area-inset-*) anywhere in file`, t.line);
  }
}

// ---------------------------------------------------------------- 4. breakpoint-hardcode

const mediaPreludes = [];
for (const m of clean.matchAll(/@media[^{]*\{/gi)) {
  mediaPreludes.push({ cond: m[0], line: lineAt(m.index) });
}
const bpViol = mediaPreludes.filter((p) => /(?:min-width|max-width)\s*:\s*[\d.]+\s*px/i.test(p.cond));
for (const b of bpViol) {
  add('breakpoint-hardcode', 'FAIL',
    `raw-px breakpoint in "${b.cond.replace(/\s+/g, ' ').trim()}" — use rem (~30/48/64/90rem) or a breakpoint token var`,
    b.line);
}
const remBreakpoints = mediaPreludes.filter((p) =>
  /(?:min-width|max-width)\s*:/i.test(p.cond) && !/[\d.]+\s*px/i.test(p.cond));

// ---------------------------------------------------------------- block parser (rules / decls / media ctx)

function parseCss(text) {
  const root = [];
  const stack = [root];
  let i = 0, line = 1;
  const n = text.length;

  const skipString = (q) => {
    i++;
    while (i < n && text[i] !== q) {
      if (text[i] === '\n') line++;
      if (text[i] === '\\') { i++; if (i < n) i++; continue; }
      i++;
    }
    if (i < n) i++;
  };

  while (i < n) {
    const c = text[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r' || c === '\f') { i++; continue; }
    if (c === '"' || c === "'") { skipString(c); continue; }
    if (c === '}') { if (stack.length > 1) stack.pop(); i++; continue; }
    if (c === ';') { i++; continue; }
    const startLine = line;
    let prelude = '';
    while (i < n && text[i] !== '{' && text[i] !== ';' && text[i] !== '}') {
      if (text[i] === '"' || text[i] === "'") { skipString(text[i]); continue; }
      prelude += text[i];
      i++;
    }
    const trimmed = prelude.trim();
    if (i < n && text[i] === '{') {
      const kind = trimmed.startsWith('@')
        ? (/^@media\b/i.test(trimmed) ? 'media' : 'atrule')
        : 'rule';
      const node = { kind, prelude: trimmed, line: startLine, children: [] };
      stack[stack.length - 1].push(node);
      stack.push(node.children);
      i++;
      continue;
    }
    if (trimmed) stack[stack.length - 1].push({ kind: 'decl', prelude: trimmed, line: startLine, children: [] });
  }
  return root;
}

function isTouchTarget(selector) {
  if (/\[role\s*=\s*["']?button["']?\]/i.test(selector)) return true;
  return /(^|[\s,>+~(])(a|button|input)(?=[\s.#:\[,>+~)]|$)/i.test(selector);
}

// px-equivalent for height checks: px as-is; rem/em × 16 (root size). calc()/var()/svh → null (unresolvable).
function toPx(value) {
  const m = /^(\d+(?:\.\d+)?)(px|rem|em)$/i.exec(value);
  if (!m) return null;
  return /px/i.test(m[2]) ? parseFloat(m[1]) : parseFloat(m[1]) * 16;
}

// ---------------------------------------------------------------- 5 + 6: rule-level analysis

const compliantTargets = [];
const widthChecked = [];

function analyzeNodes(nodes, ctx) {
  for (const node of nodes) {
    if (node.kind === 'media') {
      const coarseNone = /pointer\s*:\s*coarse/i.test(node.prelude)
        || /hover\s*:\s*none/i.test(node.prelude);
      const minWidth = /\bmin-width\b/i.test(node.prelude);
      analyzeNodes(node.children, {
        coarseNone: ctx.coarseNone || coarseNone,
        minWidth: ctx.minWidth || minWidth,
      });
    } else if (node.kind === 'atrule') {
      analyzeNodes(node.children, ctx);
    } else if (node.kind === 'rule') {
      const selector = node.prelude;
      const isTouch = isTouchTarget(selector);
      for (const child of node.children) {
        if (child.kind === 'decl') {
          const m = /^([a-zA-Z-]+)\s*:\s*(.*)$/s.exec(child.prelude);
          if (!m) continue;
          const prop = m[1].toLowerCase();
          let value = m[2].trim().replace(/\s*!important\s*$/i, '').trim();
          if (isTouch && (prop === 'min-height' || prop === 'height')) {
            const px = toPx(value);
            if (px !== null && px < 44) {
              add('touch-target-static', ctx.coarseNone ? 'FAIL' : 'WARN',
                `${selector} { ${prop}: ${value} } — ${px}px < 44px touch floor (WCAG 2.5.5 / Apple HIG)` +
                (ctx.coarseNone ? ' inside (pointer: coarse)/(hover: none)' : ' (outside pointer media blocks)'),
                child.line);
            } else if (px !== null && px >= 44) {
              compliantTargets.push({ line: child.line, sel: selector, px });
            }
          }
          if (prop === 'width') {
            const wm = /^(\d+(?:\.\d+)?)px$/i.exec(value);
            if (wm && parseFloat(wm[1]) > 320) {
              widthChecked.push({ line: child.line, sel: selector, px: parseFloat(wm[1]), exempt: ctx.minWidth });
              if (!ctx.minWidth) {
                add('horizontal-overflow-static', 'WARN',
                  `${selector} { width: ${value} } — fixed width ${wm[1]}px > 320 not inside a min-width media query (320px overflow risk)`,
                  child.line);
              }
            }
          }
        } else if (child.kind === 'rule' || child.kind === 'media' || child.kind === 'atrule') {
          analyzeNodes([child], ctx);
        }
      }
    }
  }
}

analyzeNodes(parseCss(clean), { coarseNone: false, minWidth: false });

// ---------------------------------------------------------------- report

const checks = [
  { id: 'clamp-rem', desc: 'clamp() rem term (WCAG F94)' },
  { id: 'viewport-units', desc: 'no literal 100vh (svh/dvh)' },
  { id: 'safe-area', desc: 'env(safe-area-inset-*) for fixed/sticky/bottom chrome' },
  { id: 'breakpoint-hardcode', desc: 'no raw-px min/max-width breakpoints' },
  { id: 'touch-target-static', desc: '44px+ targets under (pointer:coarse)/(hover:none)' },
  { id: 'horizontal-overflow-static', desc: 'no width >320px outside min-width media' },
];

const byCheck = (id) => findings.filter((f) => f.check === id);

function evidence() {
  const lines = {
    'clamp-rem': clampOcc.filter((c) => c.hasRem).map((c) => c.line),
    'viewport-units': dynVh,
    'safe-area': safeAreaMatches.map((s) => s.line),
    'breakpoint-hardcode': remBreakpoints.map((b) => b.line),
    'touch-target-static': compliantTargets.map((t) => t.line),
    'horizontal-overflow-static': widthChecked.filter((w) => w.exempt).map((w) => w.line),
  };
  return lines;
}
const ev = evidence();

console.log(`P31 mobile-first audit — ${file}${label ? ` [label: ${label}]` : ''}`);
console.log('─'.repeat(72));

const statusByCheck = {};
for (const c of checks) {
  const fs = byCheck(c.id);
  const fails = fs.filter((f) => f.severity === 'FAIL');
  const warns = fs.filter((f) => f.severity === 'WARN');
  let status;
  if (fails.length > 0) status = 'FAIL';
  else if (warns.length > 0) status = 'WARN';
  else status = 'PASS';
  statusByCheck[c.id] = status;

  const head = `[${status}] ${c.id}`.padEnd(36) + c.desc;
  console.log(head);
  for (const f of fs) {
    console.log(`    ${file}:${f.line}: ${f.message}`);
  }
  if (status === 'PASS') {
    const es = ev[c.id] || [];
    if (es.length > 0) {
      console.log(`    ok — evidence ${c.id}: ${es.slice(0, 6).map((l) => `${file}:${l}`).join(', ')}${es.length > 6 ? ' …' : ''}`);
    } else {
      console.log(`    ok — no violations${c.id === 'touch-target-static' ? ' (no a/button/[role=button]/input height rules found)' : ''}`);
    }
  }
}

const failChecks = checks.filter((c) => statusByCheck[c.id] === 'FAIL');
const warnChecks = checks.filter((c) => statusByCheck[c.id] === 'WARN');
const failN = findings.filter((f) => f.severity === 'FAIL').length;
const warnN = findings.filter((f) => f.severity === 'WARN').length;

console.log('─'.repeat(72));
console.log(`SUMMARY: ${checks.length} checks | ${failChecks.length} failed${warnChecks.length ? ` | ${warnChecks.length} warned` : ''} | ${findings.length} findings (${failN} FAIL, ${warnN} WARN)`);
if (findings.length > 0) {
  console.log('Findings:');
  for (const f of findings) {
    console.log(`  - ${file}:${f.line} [${f.severity}] ${f.check}: ${f.message}`);
  }
}
console.log(failChecks.length === 0
  ? 'RESULT: PASS'
  : `RESULT: FAIL — ${failChecks.length} check(s) failed (fail closed)`);

process.exit(failChecks.length === 0 ? 0 : 1);