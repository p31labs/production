#!/usr/bin/env node
/**
 * check-tier-promotion.mjs — the tier-promotion gate.
 *
 * A component's tier is a promotion decision, not a decoration. This gate
 * enforces the two non-negotiable edges of the lifecycle:
 *   - `deprecated` MUST have its tokens marked `$deprecated` in the DTCG tree
 *     (a retirement without a deprecation signal is a silent removal).
 *   - `core` MUST carry the full contract surface (description + cssClass +
 *     tokens) — the review bar a promoted component has to clear.
 */
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const portal = resolve(here, '..');
const root = resolve(portal, '..', '..');

const registry = JSON.parse(readFileSync(join(root, 'packages', 'design-core', 'registry.json'), 'utf8'));
const dtcg = JSON.parse(readFileSync(join(root, 'packages', 'canon', 'tokens', 'tokens.dtc.json'), 'utf8'));

// Flatten the p31 subtree to a set of deprecated dotted paths.
const deprecatedTokens = new Set();
(function walk(node, path) {
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('$')) continue;
    if (v && typeof v === 'object' && !('$value' in v)) walk(v, [...path, k]);
    else if (v && typeof v === 'object' && v.$deprecated) deprecatedTokens.add([...path, k].join('.'));
  }
})(dtcg.p31 ?? {}, []);

const problems = [];
for (const c of registry.items) {
  if (c.tier === 'deprecated') {
    const hasDeprecated = (c.tokens ?? []).some((t) => deprecatedTokens.has(t));
    if (!hasDeprecated) problems.push(`${c.name}: tier 'deprecated' but no token is marked $deprecated.`);
  }
  if (c.tier === 'core') {
    if (!c.description) problems.push(`${c.name}: tier 'core' but missing description.`);
    if (!c.cssClass) problems.push(`${c.name}: tier 'core' but missing cssClass.`);
    if (!(c.tokens ?? []).length) problems.push(`${c.name}: tier 'core' but no tokens.`);
  }
}

if (problems.length) {
  console.error('✗ check-tier-promotion:');
  problems.forEach((p) => console.error(`   ${p}`));
  process.exit(1);
}
console.log(`✅ check-tier-promotion: all ${registry.items.length} components satisfy their tier contract.`);