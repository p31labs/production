// V5-A-canon-sandbox/a5-fixtures.mjs — Lane A v5.0, A-5 support.
// Generates the gate fixtures FROM the rehearsed sandbox canon:
//   fixtures/sandbox-brands-union.fixture.json    (gate b: R1-R6, union Base)
//   fixtures/sandbox-brands-strict.fixture.json   (gate f: intersection Base — F1 proof)
//   fixtures/neg-F1-readded.fixture.json          (NC i: sunlight.text re-added → R2 MUST fail)
//   fixtures/neg-no-versionpolicy.fixture.json    (NC ii: one brand w/o versionPolicy → R6 MUST fail)
//   fixtures/sandbox-policy-scan.fixture.json     (gate c: policy-scan CLI --fixture)
// Base construction replicates validates-v3.mjs buildUnionBase/buildIntersectionBase
// (defaults = cipher; text default = canonical p31.text when a pack carries it).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { flattenP31 } from '/home/p31/production/design-workflow/V3-D-resilience/policy-scan.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TOKENS = process.argv[2] ?? join(HERE, 'tokens', 'tokens.dtc.json'); // argv: point at REAL canon post-merge
const FIX = join(HERE, 'fixtures');
mkdirSync(FIX, { recursive: true });

const canon = JSON.parse(readFileSync(TOKENS, 'utf8'));
const themes = canon.themes;
const names = Object.keys(themes).sort();
if (names.length !== 11) throw new Error(`expected 11 packs, got ${names.length}`);

const extract = (pack) => {
  const out = {};
  for (const [n, def] of Object.entries(pack.p31 ?? {})) out[n] = { $value: def.$value, $type: def.$type };
  return out;
};

function unionBase(packs) {
  const all = new Set();
  for (const p of Object.values(packs)) for (const n of Object.keys(p)) all.add(n);
  const base = {};
  for (const n of all) {
    if (n in packs.cipher) base[n] = packs.cipher[n];
    else if (n === 'text' && canon.p31?.text) base[n] = { $value: canon.p31.text.$value, $type: canon.p31.text.$type };
    else base[n] = { $value: null, $type: 'missing' };
  }
  return base;
}

function intersectionBase(packs) {
  const common = Object.values(packs)
    .map((p) => new Set(Object.keys(p)))
    .reduce((acc, s) => new Set([...acc].filter((n) => s.has(n))));
  const filtered = {};
  for (const [k, p] of Object.entries(packs)) filtered[k] = Object.fromEntries([...common].map((n) => [n, p[n]]).filter(([, d]) => d));
  return unionBase(filtered);
}

const packs = {};
const vps = {};
for (const n of names) { packs[n] = extract(themes[n]); vps[n] = themes[n].versionPolicy; }

function buildFixture({ base, packs: p, vps: v, strict = false }) {
  const brands = [{ name: 'Base', versionPolicy: 'exact', tokens: base }];
  for (const n of names) brands.push({ name: n, $extends: ['Base'], versionPolicy: v[n], tokens: p[n] });
  return { name: strict ? 'sandbox-brands-strict' : 'sandbox-brands-union', brands };
}

const union = unionBase(packs);
const inter = intersectionBase(packs);
writeFileSync(join(FIX, 'sandbox-brands-union.fixture.json'), JSON.stringify(buildFixture({ base: union, packs, vps }), null, 2) + '\n');
writeFileSync(join(FIX, 'sandbox-brands-strict.fixture.json'), JSON.stringify(buildFixture({ base: inter, packs, vps, strict: true }), null, 2) + '\n');

// NC (i): F1 re-added — sunlight gains back its child-introduced `text`.
const packsF1 = JSON.parse(JSON.stringify(packs));
packsF1.sunlight.text = { $value: { colorSpace: 'oklch', components: [0.22, 0.015, 80] }, $type: 'color' };
writeFileSync(join(FIX, 'neg-F1-readded.fixture.json'), JSON.stringify(buildFixture({ base: inter, packs: packsF1, vps, strict: true }), null, 2) + '\n');

// NC (ii): one brand (garden) loses versionPolicy (key omitted in JSON).
const vpsNC2 = { ...vps, garden: undefined };
writeFileSync(join(FIX, 'neg-no-versionpolicy.fixture.json'), JSON.stringify(buildFixture({ base: union, packs, vps: vpsNC2 }), null, 2) + '\n');

// Gate (c): policy-scan CLI --fixture over the sandbox p31 namespace.
writeFileSync(join(FIX, 'sandbox-policy-scan.fixture.json'), JSON.stringify({ name: 'sandbox-policy-scan', tokens: flattenP31(canon) }, null, 2) + '\n');

console.log('fixtures written:');
console.log(`  union base ${Object.keys(union).length} names; intersection base ${Object.keys(inter).length} names; brands ${names.length} (each ${Object.keys(packs[names[0]]).length} tokens)`);
console.log(`  vps: ${names.map((n) => `${n}=${vps[n]}`).join(' ')}`);
console.log(`  neg-F1-readded sunlight tokens: ${Object.keys(packsF1.sunlight).length} (text re-added: ${'text' in packsF1.sunlight})`);
console.log(`  neg-no-versionpolicy: garden vp = ${JSON.stringify(vpsNC2.garden)}`);