#!/usr/bin/env node
/**
 * @file B1-drift — registry ↔ dispatcher parity detector (read-only).
 *
 * LANE B v3.0 — MCP canonical surface. Pure Node 24 ESM, zero deps, zero
 * TypeScript imports. Parses the two canonical .ts files with regex only:
 *
 *   tool-registry.ts : advertises schemas via  `name: 'snake_tool'`
 *   tools.worker.ts  : dispatches handlers via `case 'snake_tool':`
 *
 * A tool "registered but not dispatched" is a live gap: under the canonical
 * http-worker a client calling it hits the unknown-tool path
 * (tools.worker.ts:762). This detector is the sensor for that drift — it can
 * fail, so it is a gate (runbook §2.6: a gate that cannot fail is furniture).
 *
 * Exit: 0 when the registered set and the dispatched set are equal;
 *       1 when they differ (registered-minus-dispatched or dispatched-minus-
 *       registered are both reported).
 *
 * Usage:
 *   node drift-detector.mjs                                  # real canon paths
 *   node drift-detector.mjs <registry.ts> <dispatch.ts>      # fixtures/other
 *
 * Negative controls live in ./fixtures:
 *   match pair    -> exit 0 (registry-match.ts / dispatch-match.ts)
 *   mismatch pair -> exit 1 (registry-mismatch.ts / dispatch-mismatch.ts)
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

// Canonical source (runbook §5 B-1 input). Verified on disk 2026-10-11:
//   tool-registry.ts advertises 17 schemas; tools.worker.ts dispatches 13.
const DEFAULT_REGISTRY = resolve(
  HERE, '../../packages/design-core/src/mcp/tool-registry.ts',
);
const DEFAULT_DISPATCH = resolve(
  HERE, '../../packages/design-core/src/mcp/tools.worker.ts',
);

/**
 * Extract registered tool names from a tool-registry source file.
 * Pattern: `name: 'snake_tool',` — the only `name: '<string literal>'` shape
 * in tool-registry.ts (inputSchema property keys are `name: {` objects and
 * `enum`/`required` arrays hold no `name:` string literals), so this cannot
 * false-positive on schema property names.
 */
function extractRegistered(src) {
  const names = [];
  const re = /name:\s*'([a-zA-Z0-9_]+)'\s*,/g;
  let m;
  while ((m = re.exec(src)) !== null) names.push(m[1]);
  return names;
}

/**
 * Extract dispatched tool names from a dispatcher source file.
 *
 * Anchors on the outer `switch (name)` of handleToolCall and reads ONLY
 * depth-1 `case '...':` labels, so the nested `switch (framework)` inside
 * generate_component (its `case 'react'|'astro'|'html'|'webcomponent'`
 * labels) cannot false-positive. COMPONENT_TEMPLATES object keys
 * (`GlassPanel: (name, def) =>`) are bare identifiers, never `case` labels.
 */
function extractDispatched(src) {
  const anchor = src.indexOf('switch (name)');
  if (anchor === -1) return [];
  const names = [];
  let depth = 0;
  let i = anchor;
  const re = /case\s+'([a-zA-Z0-9_]+)'\s*:/g;
  // Walk char by char with brace-depth tracking from the anchor.
  while (i < src.length) {
    const ch = src[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) break; // outer switch closed — stop
    } else if (depth === 1 && ch === 'c' && src.startsWith("case '", i)) {
      re.lastIndex = i;
      const m = re.exec(src);
      if (m) names.push(m[1]);
      i = re.lastIndex;
      continue;
    }
    i += 1;
  }
  return names;
}

/** Set difference: a minus b (insertion-ordered). */
function diffSet(a, b) {
  const bSet = new Set(b);
  return a.filter((x) => !bSet.has(x));
}

function load(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch (err) {
    console.error(`drift-detector: cannot read ${file} — ${err.message}`);
    process.exit(2);
  }
}

function main() {
  const [registryPath, dispatchPath] = process.argv.slice(2);
  const registryFile = registryPath ? resolve(registryPath) : DEFAULT_REGISTRY;
  const dispatchFile = dispatchPath ? resolve(dispatchPath) : DEFAULT_DISPATCH;

  const registered = extractRegistered(load(registryFile));
  const dispatched = extractDispatched(load(dispatchFile));

  // De-duplicate while preserving first-seen order (a tool is declared once).
  const reg = [...new Set(registered)];
  const disp = [...new Set(dispatched)];

  const missing = diffSet(reg, disp); // registered, not dispatched
  const extra = diffSet(disp, reg);   // dispatched, not registered

  console.log(`registry  (${reg.length} advertised): ${reg.join(', ')}`);
  console.log(`dispatch  (${disp.length} implemented): ${disp.join(', ')}`);
  console.log(`missing (registered, no handler): ${missing.length ? missing.join(', ') : '(none)'}`);
  console.log(`extra   (handler, no schema):     ${extra.length ? extra.join(', ') : '(none)'}`);

  if (missing.length === 0 && extra.length === 0) {
    console.log('DRIFT: none — registry and dispatcher are in parity.');
    process.exit(0);
  }
  console.log(`DRIFT: ${missing.length + extra.length} tool(s) out of parity (17-vs-13 finding: ${missing.length} missing handlers).`);
  process.exit(1);
}

main();