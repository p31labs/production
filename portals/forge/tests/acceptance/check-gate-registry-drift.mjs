#!/usr/bin/env node
/**
 * check-gate-registry-drift (forge) — the loom precedent applied.
 *
 * The forge portal ships the gate registry in TWO places:
 *   1. production/portals/forge/tests/acceptance/gates.json  (portal-local)
 *   2. packages/govern/domains/forge/constitution.json       (govern runtime)
 *
 * They must agree on every gate's state + NC wiring. If they drift, CI fails.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const here = resolve(import.meta.dirname)
const portal = JSON.parse(readFileSync(resolve(here, 'gates.json'), 'utf8'))
const conPath = resolve('/home/p31/P31-local-workspace/packages/govern/domains/forge/constitution.json')
if (!existsSync(conPath)) {
  console.error(`forge govern constitution missing: ${conPath}`)
  process.exit(1)
}
const govern = JSON.parse(readFileSync(conPath, 'utf8'))

// Normalize owner (string vs credential array) + scope so the two registries
// can be compared directly — the design-portal pattern.
const normalizeOwner = (g) =>
  Array.isArray(g.owner) ? g.owner.map((o) => o.id ?? o).join(',') : String(g.owner)
const shape = (g) => ({ id: g.id, state: g.state, owner: normalizeOwner(g), scope: g.scope, hasNC: !!g.negativeControl })
const portalMap = new Map(portal.gates.map((g) => [g.id, shape(g)]))
const governMap = new Map(govern.gates.map((g) => [g.id, shape(g)]))

const problems = []
const all = new Set([...portalMap.keys(), ...governMap.keys()])
for (const id of all) {
  const p = portalMap.get(id)
  const g = governMap.get(id)
  if (!p) { problems.push(`gate "${id}": in govern but not portal`); continue }
  if (!g) { problems.push(`gate "${id}": in portal but not govern`); continue }
  if (p.state !== g.state) problems.push(`gate "${id}": state (portal=${p.state}, govern=${g.state})`)
  if (p.owner !== g.owner) problems.push(`gate "${id}": owner (portal=${p.owner}, govern=${g.owner})`)
  if (p.scope !== g.scope) problems.push(`gate "${id}": scope (portal=${p.scope}, govern=${g.scope})`)
  if (p.hasNC !== g.hasNC) problems.push(`gate "${id}": NC wiring (portal=${p.hasNC}, govern=${g.hasNC})`)
}
if (problems.length) {
  console.error(`✗ REGISTRY DRIFT — ${problems.length}:`)
  for (const p of problems) console.error(`   - ${p}`)
  process.exit(1)
}
console.log(`✅ REGISTRY DRIFT: ${portal.gates.length} portal gates + ${govern.gates.length} govern gates agree.`)
