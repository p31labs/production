#!/usr/bin/env node
/**
 * token-tier-audit — enforce the three-tier token architecture in src/tokens.css:
 *   primitive (literal oklch/px/rem values) → semantic (aliases) → component
 *   (scoped, must reference SEMANTIC only — never a primitive directly, so
 *   Chameleon theming stays one level).
 * Every --p31-* / --surface-* token must be tagged with a `/* tier: X *\/`
 * marker. Run after edits. Usage: node scripts/token-tier-audit.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const TOKENS = join(ROOT, '..', 'src', 'tokens.css');
const src = readFileSync(TOKENS, 'utf8');

let fail = 0;

// 1) split into tier blocks by the /* tier: X */ markers.
const blocks = [];
const re = /\/\* tier: (\w+) \*\/([\s\S]*?)(?=\/\* tier: |\n\})/g;
let m;
while ((m = re.exec(src)) !== null) {
  const tier = m[1];
  const body = m[2];
  const tokens = [...body.matchAll(/(--[\w-]+):/g)].map((x) => x[1]);
  blocks.push({ tier, tokens });
  if (!['primitive', 'semantic', 'component'].includes(tier)) {
    console.error(`✗ token-tier — unknown tier "${tier}"`);
    fail = 1;
  }
}

// 2) build the tier map; flag any token WITHOUT a tier.
const tierMap = new Map();
for (const b of blocks) for (const t of b.tokens) tierMap.set(t, b.tier);

const declared = new Set([...tierMap.keys()]);
const allDecls = new Set([...src.matchAll(/(--[\w-]+):\s/g)].map((x) => x[1]));
for (const t of allDecls) {
  if (!declared.has(t)) {
    console.error(`✗ token-tier — token ${t} has no tier marker`);
    fail = 1;
  }
}

// 3) component tokens must reference semantic (or literal) — never primitive.
for (const b of blocks) {
  if (b.tier !== 'component') continue;
  for (const t of b.tokens) {
    const decl = new RegExp(`${t}\\s*:\\s*([^;]+);`);
    const mm = src.match(decl);
    if (!mm) continue;
    const value = mm[1];
    for (const ref of value.matchAll(/var\((--[\w-]+)/g)) {
      const dep = ref[1];
      const depTier = tierMap.get(dep);
      if (depTier === 'primitive') {
        console.error(`✗ token-tier — component token ${t} references primitive ${dep} directly`);
        fail = 1;
      }
    }
  }
}

if (fail) {
  console.error('\ntoken-tier-audit FAIL — fix the token tiers before deploy.');
  process.exit(1);
}
console.log(`token-tier-audit OK — ${declared.size} tokens across ${tierMap.size ? '3' : '0'} tiers, no component→primitive refs`);