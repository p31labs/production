#!/usr/bin/env node
/**
 * ui-forge-live.mjs — the live "click the button" proof.
 *
 * Runs forge() with the REAL Workers AI router as the Dreamer provider
 * (provider-workers-ai.mjs) and prints the winning surface + gate verdict.
 * Requires CLOUDFLARE_ACCOUNT_ID + CF_API_TOKEN + WORKERS_AI_FREE_TIER=1.
 *
 * Usage:
 *   node scripts/ui-forge-live.mjs '{"title":"Spoon Tracker","entities":[{"name":"spoon","fields":[{"name":"level","type":"number"}]}],"actions":[{"name":"logSpoon"}]}'
 */
import { forge } from '../src/center.mjs';
import { workersAiProvider } from '../src/provider-workers-ai.mjs';
import uiSchema from '../ui-schema.json' with { type: 'json' };

const raw = process.argv[2];
let spec;
if (raw) {
  try { spec = JSON.parse(raw); } catch { console.error('bad spec JSON'); process.exit(1); }
} else {
  spec = {
    title: 'Spoon Tracker',
    entities: [{ name: 'spoon', fields: [{ name: 'level', type: 'number' }] }],
    actions: [{ name: 'logSpoon' }],
  };
}

const t0 = Date.now();
const report = await forge(spec, {
  k: 3,
  provider: workersAiProvider,
  providerOpts: { catalog: uiSchema.catalog, schema: uiSchema.schema },
});

console.log(`\n=== FORGE LIVE (${Date.now() - t0}ms) ===`);
console.log('tier      :', report.tier);
console.log('gate      :', report.gate?.status ?? 'not-run');
console.log('candidates:', report.logs?.candidates, '→ survivors:', report.logs?.survivors);
if (report.gate?.state) {
  console.log('axes      :', JSON.stringify(report.gate.state));
}
if (report.artifact) {
  console.log('artifact  :', JSON.stringify(report.artifact, null, 2).slice(0, 1200));
}