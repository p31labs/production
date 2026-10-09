#!/usr/bin/env node
/**
 * ui-forge.mjs — the P31 tetrahedral UI engine CLI.
 *
 * Usage:
 *   node ui-forge.mjs --spec <backend-spec.json> [--k 4] [--reviews reviews.json]
 *                     [--json] [--endpoint <phos-ai-proxy URL>] [--schema <url|path>]
 *
 * --spec     path to a backend spec (entities/actions/relations) — "feed any
 *            backend info"
 * --k        number of Dreamer candidates (default 4)
 * --reviews  path to a JSON array of /vision specialist reviews (the SIC-POVM
 *            measurement tetrahedron); when provided, the Center runs the gate
 * --json     print the full Center report as JSON
 * --endpoint override the phos-ai-proxy URL the Dreamer provider calls
 * --schema   the canon→JSON Schema agent contract — a URL (e.g.
 *            https://phos-ai-proxy.trimtab-signal.workers.dev/ui-schema) or a
 *            local path. Injected as the canon catalog AND the Dreamer's JSON
 *            Mode schema (constrained decoding). Defaults to the local
 *            ui-schema.json. "agents build from the schema".
 *
 * Example:
 *   node ui-forge.mjs --spec spec.json --k 4
 *   node ui-forge.mjs --spec spec.json --schema https://phos-ai-proxy.trimtab-signal.workers.dev/ui-schema --json
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { forge } from './src/center.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SCHEMA_PATH = resolve(here, 'ui-schema.json');

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const specPath = arg('--spec');
const k = Number(arg('--k') ?? 4);
const reviewsPath = arg('--reviews');
const json = process.argv.includes('--json');
const endpoint = arg('--endpoint');
const schemaArg = arg('--schema');

if (!specPath) {
  console.error('usage: node ui-forge.mjs --spec <backend-spec.json> [--k 4] [--reviews reviews.json] [--json] [--schema <url|path>]');
  process.exit(2);
}

if (endpoint) process.env.P31_FORGE_ENDPOINT = endpoint;

/** Resolve the ui-schema agent contract from a URL or local path.
 *  Returns { schema, catalog } — the same shape /ui-schema serves. */
async function resolveSchema(source) {
  if (source.startsWith('http://') || source.startsWith('https://')) {
    const res = await fetch(source, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`fetch schema HTTP ${res.status}`);
    return res.json();
  }
  return JSON.parse(readFileSync(resolve(source), 'utf8'));
}

const ui = schemaArg ? await resolveSchema(schemaArg) : JSON.parse(readFileSync(DEFAULT_SCHEMA_PATH, 'utf8'));

const spec = JSON.parse(readFileSync(resolve(specPath), 'utf8'));
const reviews = reviewsPath ? JSON.parse(readFileSync(resolve(reviewsPath), 'utf8')) : undefined;

// The schema is BOTH the injected canon catalog (Shaper/Governor) and the
// Dreamer's JSON Mode schema (constrained decoding) — "agents build from it".
const report = await forge(spec, {
  k,
  reviews,
  catalog: ui.catalog,
  providerOpts: { schema: ui.schema },
});

if (json) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log(`ui-forge — ${spec.title ?? spec.name ?? 'surface'}`);
console.log(`  schema: ${schemaArg ? schemaArg : 'local ui-schema.json'} (${ui.catalog.components.length} components)`);
console.log(`  grounded facts: ${report.logs.groundedFacts}  gaps: ${report.logs.gaps}`);
console.log(`  dreamer candidates: ${report.logs.candidates}`);
console.log(`  shaped: ${report.logs.shaped}  survivors: ${report.logs.survivors}`);
if (report.gate) {
  console.log(`  SIC-POVM gate: ${report.gate.status}`);
  if (report.gate.collapsedAxes?.length) console.log(`    collapsed axes: ${report.gate.collapsedAxes.join(', ')}`);
  if (report.gate.issues?.length) console.log(`    issues: ${report.gate.issues.join(' | ')}`);
}
console.log('');
if (report.artifact) {
  console.log('artifact:');
  console.log(JSON.stringify(report.artifact, null, 2));
} else {
  console.log('no artifact — Dreamer produced no usable candidate.');
}
for (const kd of report.kills) {
  console.log(`  kill: ${kd.reason}`);
}