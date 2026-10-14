// V5-A-canon-sandbox/a3-governance.mjs — Lane A v5.0, A-3: RFC-0006 governance deltas.
// Operates ONLY on the sandbox copy. Reuses NO modified gate scripts.
//
// Part 1 — versionPolicy on all 11 brands (C1-P3).
//   PLACEMENT DECISION (documented in A3-governance-decision.md):
//   brand-level field, NOT $extensions.p31.versionPolicy.
//   Rehearsed shape multi-brand-schema.md:64 = brand file { name, $extends,
//   versionPolicy, tokens } — versionPolicy is a sibling of name/$extends.
//   validates-v3.mjs R6 (fixture mode) reads b.versionPolicy at brand level.
//   In today's flat canon file the theme pack IS the brand, so the field lands
//   as themes.<name>.versionPolicy (sibling of p31). Value: "minor" (RFC-0006
//   operator-runbook starting value).
// Part 2 — C1-P4 SHAPE rehearsal: brands-rehearsal/Base/tokens.json +
//   brands/<name>/tokens.json with $extends. The canon file is NOT renamed;
//   the rehearsal tree is a separate manifest of the future shape.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TOKENS = join(HERE, 'tokens', 'tokens.dtc.json');
const REHEARSAL = join(HERE, 'brands-rehearsal');

const doc = JSON.parse(readFileSync(TOKENS, 'utf8'));
const themes = doc.themes;
const names = Object.keys(themes).sort();
if (names.length !== 11) throw new Error(`expected 11 theme packs, got ${names.length}`);

// ── Part 1: versionPolicy on every brand pack ────────────────────────────────
let added = 0;
for (const name of names) {
  const existing = themes[name].versionPolicy;
  if (existing !== undefined && existing !== 'minor') throw new Error(`versionPolicy already ${existing}: ${name}`);
  if (existing === 'minor') { added += 1; continue; } // idempotent re-run
  themes[name].versionPolicy = 'minor';
  added += 1;
}
// NOTE: Base's versionPolicy is rehearsed in the brands-rehearsal tree (Base is
// not a theme pack in today's flat canon). Base value decision: "exact".
writeFileSync(TOKENS, JSON.stringify(doc, null, 2) + '\n');
console.log(`A-3 part 1: versionPolicy "minor" added to ${added}/11 brand packs`);

// ── Part 2: C1-P4 brands shape rehearsal ─────────────────────────────────────
// Union Base construction — replicating validates-v3.mjs buildUnionBase
// (defaults = cipher; text default = canonical p31.text when a pack carries it).
const union = new Set();
for (const pack of Object.values(themes)) for (const n of Object.keys(pack.p31)) union.add(n);
const base = {};
for (const n of union) {
  if (n in themes.cipher.p31) {
    const t = themes.cipher.p31[n];
    base[n] = { $value: t.$value, $type: t.$type };
  } else if (n === 'text' && doc.p31?.text) {
    base[n] = { $value: doc.p31.text.$value, $type: doc.p31.text.$type };
  } else {
    base[n] = { $value: null, $type: 'missing' };
  }
}

const baseDir = join(REHEARSAL, 'Base');
const brandsDir = join(REHEARSAL, 'brands');
mkdirSync(baseDir, { recursive: true });
mkdirSync(brandsDir, { recursive: true });

writeFileSync(join(baseDir, 'tokens.json'), JSON.stringify({
  name: 'Base',
  versionPolicy: 'exact', // decision: Base pinned; children "minor" (see decision file)
  tokens: base,
}, null, 2) + '\n');

const manifest = { shape: 'C1-P4 brands/<name>/tokens.json rehearsal', baseFile: 'brands-rehearsal/Base/tokens.json', brands: [] };
let totalOverrides = 0;
for (const name of names) {
  const pack = themes[name].p31;
  const tokens = {};
  for (const [tn, def] of Object.entries(pack)) tokens[tn] = { $value: def.$value, $type: def.$type };
  mkdirSync(join(brandsDir, name), { recursive: true });
  writeFileSync(join(brandsDir, name, 'tokens.json'), JSON.stringify({
    name,
    $extends: ['../../Base/tokens.json'],
    versionPolicy: 'minor',
    tokens,
  }, null, 2) + '\n');
  totalOverrides += Object.keys(tokens).length;
  manifest.brands.push({ file: `brands/${name}/tokens.json`, name, $extends: ['../../Base/tokens.json'], versionPolicy: 'minor', tokenNames: Object.keys(tokens) });
}
writeFileSync(join(HERE, 'A3-brands-shape-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log(`A-3 part 2: brands-rehearsal tree — Base/tokens.json (${Object.keys(base).length} structural names) + ${names.length} brand files (${totalOverrides} override entries)`);
console.log('A-3 RESULT: PASS');