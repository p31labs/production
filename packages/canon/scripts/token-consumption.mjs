#!/usr/bin/env node
/**
 * @p31ca/canon — token-consumption.mjs
 *
 * The consumption check: does a contract's tokenContract actually get
 * CONSUMED by the component's CSS, or is the token merely EMITTED and inherited?
 *
 * Custom properties inherit from :root, so `getComputedStyle(el).getPropertyValue`
 * is non-empty for every token on every element — the emission check is
 * trivially true. This script proves the other half, statically: it maps each
 * component's CSS class (design-core registry `cssClass`) to the `var(--p31-*)`
 * references in its CSS block, then checks every tokenContract token resolves
 * to a flat var that the component's CSS actually references.
 *
 * Report:
 *   - per-component: tokenContract tokens NOT referenced in the component CSS
 *   - coverage: emitted tokens (dist/tokens.css) vs consumed (referenced in any
 *     design-core CSS). Industry benchmark: 40.4% average coverage.
 *
 * Usage: node scripts/token-consumption.mjs [--json]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const canon = resolve(here, '..');
const designCore = resolve(canon, '..', 'design-core');

// ── class → set of var(--p31-*) references, from design-core CSS ─────────
const cssDir = join(designCore, 'src', 'css');
const classVars = new Map();
for (const f of readdirSync(cssDir)) {
  if (!f.endsWith('.css')) continue;
  const text = readFileSync(join(cssDir, f), 'utf8');
  for (const m of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const vars = new Set([...m[2].matchAll(/var\((--p31-[a-z0-9-]+)/g)].map((x) => x[1]));
    if (!vars.size) continue;
    for (const c of m[1].matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)) {
      const set = classVars.get(c[1]) ?? new Set();
      for (const v of vars) set.add(v);
      classVars.set(c[1], set);
    }
  }
}

// ── emitted set, from dist/tokens.css ────────────────────────────────────
const emitted = new Set(
  [...readFileSync(join(canon, 'dist', 'tokens.css'), 'utf8').matchAll(/(--p31-[a-z0-9-]+)\s*:/g)].map((x) => x[1]),
);

// ── SEMANTIC_MAP: semantic path → flat var ───────────────────────────────
const { SEMANTIC_MAP } = await import(join(canon, 'src', 'theming', 'theme-store.ts'));
const flatVarFor = (token) => {
  const path = token.replace(/^p31\./, '');
  const slot = SEMANTIC_MAP[path];
  return slot?.palette ? `--p31-${slot.palette}` : `--p31-${path.split('.').join('-')}`;
};

// ── design-core registry: name → cssClass ────────────────────────────────
const registry = JSON.parse(readFileSync(join(designCore, 'registry.json'), 'utf8'));
const cssClassBy = Object.fromEntries(registry.items.map((i) => [i.name, i.cssClass]));

// ── contracts ────────────────────────────────────────────────────────────
const contractsDir = join(canon, 'src', 'contracts');
const contracts = [];
for (const f of readdirSync(contractsDir)) {
  if (!f.endsWith('.contract.ts')) continue;
  const mod = await import(join(contractsDir, f));
  for (const k of Object.keys(mod)) if (k.endsWith('Contract')) contracts.push(mod[k]);
}

let missingComponents = 0;
const unconsumed = [];
for (const c of contracts) {
  const cls = cssClassBy[c.name];
  if (!cls) continue;
  const consumed = new Set();
  for (const [cname, vars] of classVars) {
    if (cname === cls || cname.startsWith(cls + '-')) {
      for (const v of vars) consumed.add(v);
    }
  }
  const claimed = new Set(c.tokenContract.map(flatVarFor));
  const missing = [...claimed].filter((flat) => !consumed.has(flat));
  const unclaimed = [...consumed].filter((flat) => !claimed.has(flat));
  if (missing.length) {
    missingComponents++;
    unconsumed.push({ name: c.name, cls, missing });
  }
  if (missing.length) console.log(`✗ ${c.name} (${cls}) over-claims: ${missing.join(', ')}`);
  if (unclaimed.length) console.log(`  ${c.name} under-claims (CSS uses, contract omits): ${unclaimed.join(', ')}`);
}

const allConsumed = new Set([...classVars.values()].flatMap((s) => [...s]));
const dead = [...emitted].filter((v) => !allConsumed.has(v));
const coverage = ((allConsumed.size / emitted.size) * 100).toFixed(1);

console.log(`\ncoverage: ${allConsumed.size}/${emitted.size} emitted tokens are consumed (${coverage}%)`);
console.log(`unconsumed contract tokens: ${missingComponents} component(s) reference tokens their CSS never uses`);
console.log(`dead tokens (emitted, referenced nowhere): ${dead.length}`);
if (dead.length) console.log('  ' + dead.slice(0, 20).join(', ') + (dead.length > 20 ? ` … +${dead.length - 20}` : ''));

if (missingComponents > 0) process.exitCode = 1;