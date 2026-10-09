#!/usr/bin/env node
/**
 * audit-redundancy.mjs — the double-padding gate.
 *
 * Fails if a <GlassCard className="X"><CardBody> pattern exists where X
 * already declares padding in CSS. The class IS the contract; CardBody
 * would double it.
 *
 * Negative control: a planted double-padded card fails.
 *
 * Usage: node scripts/audit-redundancy.mjs
 */
import { readdirSync, readFileSync, lstatSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = lstatSync(p);
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) {
      if (/node_modules|\.git|dist|target|vendor/.test(entry)) continue;
      walk(p, out);
    } else {
      out.push(p);
    }
  }
  return out;
}

function collectPaddingClasses() {
  const classes = new Map();
  const cssFiles = walk(join(ROOT, 'portals/shell/src')).filter((f) => f.endsWith('.css'));
  for (const css of cssFiles) {
    const content = readFileSync(css, 'utf8');
    const ruleRe = /\.([\w-]+)\s*\{([^}]*)\}/g;
    let m;
    while ((m = ruleRe.exec(content)) !== null) {
      if (/\bpadding\s*:/.test(m[2])) {
        classes.set(m[1], { file: css, line: content.slice(0, m.index).split('\n').length });
      }
    }
  }
  return classes;
}

function findDoubleWraps() {
  const violations = [];
  const tsxFiles = walk(join(ROOT, 'portals/shell/src')).filter((f) => f.endsWith('.tsx'));
  for (const tsx of tsxFiles) {
    const content = readFileSync(tsx, 'utf8');
    const re = /<GlassCard[^>]*className="([^"]+)"[^>]*>\s*(?:\n\s*)?<CardBody/gs;
    let m;
    while ((m = re.exec(content)) !== null) {
      violations.push({ tsx, className: m[1], line: content.slice(0, m.index).split('\n').length });
    }
  }
  return violations;
}

const paddingClasses = collectPaddingClasses();
const doubleWraps = findDoubleWraps();
let violations = 0;

for (const { tsx, className, line } of doubleWraps) {
  for (const cls of className.split(/\s+/)) {
    if (paddingClasses.has(cls)) {
      const { file: cssFile, line: cssLine } = paddingClasses.get(cls);
      console.error(`REDUNDANCY: ${tsx}:${line} wraps <GlassCard className="${cls}"> in <CardBody>, but .${cls} already declares padding at ${cssFile}:${cssLine}`);
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(`\naudit-redundancy: FAIL — ${violations} double-padded cards`);
  process.exit(1);
}
console.log('audit-redundancy: pass — no double-padded cards');
