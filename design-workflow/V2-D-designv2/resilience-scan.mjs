#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// V2-D-designv2/resilience-scan.mjs — Lane D v2.0, D-2 support: token
// resilience scanner. Zero dependencies. Canon is READ-ONLY.
//
// Runbook §2.2 framing: a token is a policy, not an answer. iOS 27
// user-controlled transparency + M3 Expressive adaptive spacing (June 2026)
// mean fixed-value tokens on user-controllable surfaces assume a rendering
// context that no longer exists. This scanner flags the two FIXED-VALUE
// classes that break under user control:
//
//   RULE A  fixed-opacity color tokens: $type color with a fixed `alpha`
//           and no `$extensions.p31.policy` descriptor. On a user-controllable
//           surface (glass over arbitrary backdrop, iOS transparency slider),
//           a fixed alpha silently changes perceived contrast. POLICY rewrite:
//           alpha range [min,max] + resolver surface.
//           (runbook §8 gate: "fixed opacity on slider surface → flagged")
//
//   RULE B  fixed-px type-scale dimensions: font-size tokens (h1..h4, body,
//           body-sm, label, caption) hardcoded in px break user text-size
//           adjustment and M3 adaptive spacing. POLICY rewrite: clamp() with a
//           rem term (WCAG F94; runbook §2.3 mobile-first gate).
//
// USAGE:
//   node resilience-scan.mjs            scan canon p31.* (exit 1 when flagged)
//   node resilience-scan.mjs --fixture <path>   scan a fixture token set
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';

const CANON = '/home/p31/production/packages/canon/tokens/tokens.dtc.json';

// Type-scale token names that must never be fixed px (mobile-first gate).
const TYPE_SCALE_NAMES = new Set(['h1', 'h2', 'h3', 'h4', 'body', 'body-sm', 'label', 'caption']);

function hasPolicy(def) {
  return Boolean(def.$extensions?.p31?.policy);
}

/**
 * Scan a flat token map. Returns findings [{rule, token, detail}].
 * flagForTest = ['alpha'|'px'|null] — used by fixtures to pin one rule.
 */
function scan(tokens) {
  const findings = [];
  for (const [name, def] of Object.entries(tokens)) {
    // RULE A — fixed opacity on a user-controllable surface.
    if (def.$type === 'color' && def.$value && typeof def.$value === 'object' && 'alpha' in def.$value) {
      if (!hasPolicy(def)) {
        findings.push({
          rule: 'A', token: name,
          detail: `fixed alpha ${def.$value.alpha} with no policy descriptor — user-controllable surface (glass / transparency slider) breaks the fixed value`,
        });
      }
    }
    // RULE B — fixed-px type scale.
    if (def.$type === 'dimension' && def.$value && def.$value.unit === 'px' && TYPE_SCALE_NAMES.has(name.split('.').pop())) {
      if (!hasPolicy(def)) {
        findings.push({
          rule: 'B', token: name,
          detail: `fixed font-size ${def.$value.value}px — breaks user text-size adjustment and adaptive spacing; rewrite as clamp() policy with rem term`,
        });
      }
    }
  }
  return findings;
}

/** Flatten the p31 namespace into { path: def } (skips $value/$extensions interior). */
function flattenP31(canon) {
  const out = {};
  (function walk(o, path) {
    if (o && typeof o === 'object' && '$value' in o) {
      out[path] = o;
      return;
    }
    for (const [k, v] of Object.entries(o ?? {})) {
      if (k === '$value' || k === '$extensions') continue;
      walk(v, path ? `${path}.${k}` : k);
    }
  })(canon.p31, '');
  return out;
}

function report(findings, label) {
  console.log(`=== resilience scan: ${label} ===`);
  if (findings.length === 0) {
    console.log('RESULT: CLEAN (0 findings)');
    return 0;
  }
  console.log(`RESULT: ${findings.length} FINDING(S)`);
  for (const f of findings) console.log(`  [rule ${f.rule}] ${f.token}: ${f.detail}`);
  return 1;
}

const argv = process.argv.slice(2);
if (argv[0] === '--fixture' && argv[1]) {
  const fixture = JSON.parse(readFileSync(argv[1], 'utf8'));
  const tokens = {};
  for (const [name, def] of Object.entries(fixture.tokens ?? {})) tokens[name] = def;
  process.exit(report(scan(tokens), argv[1]));
}
const canon = JSON.parse(readFileSync(CANON, 'utf8'));
process.exit(report(scan(flattenP31(canon)), 'canon p31.* namespace (READ-ONLY)'));