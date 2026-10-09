#!/usr/bin/env node
/**
 * check-gate-registry-drift — the loom precedent applied.
 *
 * The design portal ships the gate registry in TWO places:
 *   1. production/portals/design/tests/acceptance/gates.json   (portal-local, drives gate-self-test.mjs)
 *   2. packages/govern/domains/design/constitution.json        (govern runtime, drives govern audit/self-test)
 *
 * They were two hand-edited files with no automated tie, so they drifted
 * (canon-purity had an NC in govern but null in the portal registry). A
 * drift check now fails if the two registries disagree on any gate's state,
 * owner, scope, or negative-control wiring.
 *
 * Drift is defined by the gate IDs + their states + NC presence. If the two
 * disagree, CI fails — the registries must be made consistent before merge.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const here = resolve(import.meta.dirname);
const portalRegistryPath = resolve(here, 'gates.json');
const governConstitutionPath = resolve(here, '/home/p31/production/packages/govern/domains/design/constitution.json');

if (!existsSync(portalRegistryPath)) {
  console.error(`portal gate registry missing: ${portalRegistryPath}`);
  process.exit(1);
}
if (!existsSync(governConstitutionPath)) {
  console.error(`govern design constitution missing: ${governConstitutionPath}`);
  process.exit(1);
}

const portal = JSON.parse(readFileSync(portalRegistryPath, 'utf8'));
const govern = JSON.parse(readFileSync(governConstitutionPath, 'utf8'));

const portalGates = portal.gates.map((g) => ({
  id: g.id,
  state: g.state,
  owner: Array.isArray(g.owner) ? g.owner.map((o) => o.id ?? o).join(',') : String(g.owner),
  scope: g.scope,
  hasNC: !!g.negativeControl,
}));

const governGates = govern.gates.map((g) => ({
  id: g.id,
  state: g.state,
  owner: Array.isArray(g.owner) ? g.owner.map((o) => o.id ?? o).join(',') : String(g.owner),
  scope: g.scope,
  hasNC: !!g.negativeControl,
}));

const byId = (arr) => new Map(arr.map((g) => [g.id, g]));

const portalMap = byId(portalGates);
const governMap = byId(governGates);

const problems = [];
const ALL = new Set([...portalMap.keys(), ...governMap.keys()]);

for (const id of ALL) {
  const p = portalMap.get(id);
  const g = governMap.get(id);
  if (!p) {
    problems.push(`gate "${id}": in govern constitution but not in portal gates.json`);
    continue;
  }
  if (!g) {
    problems.push(`gate "${id}": in portal gates.json but not in govern constitution`);
    continue;
  }
  if (p.state !== g.state) problems.push(`gate "${id}": state differs (portal=${p.state}, govern=${g.state})`);
  if (p.hasNC !== g.hasNC) problems.push(`gate "${id}": negative-control wiring differs (portal=${p.hasNC}, govern=${g.hasNC})`);
}

if (problems.length) {
  console.error(`✗ REGISTRY DRIFT — ${problems.length} gate(s) differ between the two registries:`);
  for (const problem of problems) console.error(`   - ${problem}`);
  console.error('\n  Make gates.json and domains/design/constitution.json agree, then re-run.');
  process.exit(1);
}

console.log(`✅ REGISTRY DRIFT: ${portalGates.length} portal gates + ${governGates.length} govern gates agree on state/owner/scope/NC wiring.`);