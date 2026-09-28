#!/usr/bin/env node
/**
 * audit-derive (P4) — find status/label/badge fields that are asserted rather
 * than derived. The D4 class: a component received a status prop as a literal
 * string that never varied because nothing derived it from real state.
 *
 * This audit flags components that pass a hardcoded/status field into a
 * StatusBadge or similar, where the value is not derived from a data source.
 * It's a heuristic: flags `label="STABLE"`-style literals and hand-written
 * status fields in catalog/component data.
 *
 * Exits non-zero if a new hardcoded status/label is found.
 */
import { execSync } from 'node:child_process';

const DC = '/home/p31/P31-local-workspace/packages/design-core';
const PORTAL = '/home/p31/production/portals/design/src';

// Patterns for asserted (non-derived) status/label values.
// NOTE: type declarations (`status: 'stable' | 'beta'`) are legitimate — only
// VALUE assignments (label="X", status="X") indicate an asserted status.
const patterns = [
  'label="STABLE"', 'label="BETA"', 'label="stable"',
  'status="online"', 'status="offline"', 'status="busy"',
  'label={\'STABLE\'}', 'label={\'stable\'}',
];

const hits = [];
for (const p of patterns) {
  let found = '';
  try {
    found = execSync(
      `grep -rn "${p}" ${PORTAL} ${DC}/src/compositions ${DC}/src/generated 2>/dev/null | grep -v '.test.' | grep -v '.stories.'`,
      { encoding: 'utf8' },
    ).trim();
  } catch {
    continue; // grep exit 1 = no matches = clean
  }
  for (const line of found.split('\n')) if (line) hits.push(line);
}

if (hits.length) {
  console.error(`✗ DERIVE AUDIT: ${hits.length} asserted status/label value(s):`);
  for (const h of hits.slice(0, 20)) console.error(`  ${h}`);
  console.error(`\n  A status/label must be DERIVED from a data source, not asserted as a literal.`);
  console.error(`  (D4 class: StatusBadge given a hand-written catalog status never varied.)`);
  process.exit(1);
}
console.log('✅ DERIVE AUDIT: no asserted status/label literals — status fields are derived.');