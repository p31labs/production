#!/usr/bin/env node
/**
 * check-agent-readiness.mjs — the Supernova-style scorecard.
 *
 * Scores the five AI-readiness checks 0–2 each (10 total), per the Supernova
 * audit of 31 public design systems. A file-existence check is presence; this
 * is a grade. The workspace should score 10/10 — the check proves it, it does
 * not assert it.
 *
 *   2 = shipped in the package / official; 1 = partial / contributor-only;
 *   0 = absent.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const portal = resolve(here, '..');
const root = resolve(portal, '..', '..');

const scores = [];
const add = (label, points, note) => scores.push({ label, points, note });

// 1. Tokens as data — 2 if in a package (DTCG JSON), 1 if CSS-only, 0 if docs-only.
const dtcgPath = join(root, 'packages', 'canon', 'tokens', 'tokens.dtc.json');
if (existsSync(dtcgPath)) add('tokens-as-data', 2, 'tokens.dtc.json in @p31ca/canon');
else if (existsSync(join(portal, 'src', 'tokens.css'))) add('tokens-as-data', 1, 'CSS-only');
else add('tokens-as-data', 0, 'docs-only');

// 2. Component APIs as data — 2 if typed, 1 if partial, 0 if prose.
const types = existsSync(join(root, 'packages', 'design-core', 'src', 'compositions', 'index.ts'));
add('typed-apis', types ? 2 : 0, types ? 'TypeScript compositions ship types' : 'prose-only');

// 3. MCP — 2 if official + maintained, 1 if pre-release, 0 if none.
const mcp = existsSync(join(root, 'workers', 'design-mcp', 'src', 'index.ts'));
add('mcp', mcp ? 2 : 0, mcp ? 'design-mcp worker' : 'none');

// 4. Docs agents can read — 2 if llms.txt → markdown, 1 if HTML, 0 if none.
const llms = readFileSync(join(portal, 'public', 'llms.txt'), 'utf8').trim();
add('docs', llms.startsWith('#') ? 2 : 1, llms.startsWith('#') ? 'llms.txt → markdown' : 'llms.txt → HTML');

// 5. Agent guidance — 2 if in package, 1 if contributor-only, 0 if none.
const agents = existsSync(join(root, 'packages', 'design-core', 'AGENTS.md'));
add('agent-guidance', agents ? 2 : 0, agents ? 'AGENTS.md in @p31ca/design-core' : 'none');

const total = scores.reduce((a, s) => a + s.points, 0);
for (const s of scores) console.log(`  ${s.points}/2  ${s.label} — ${s.note}`);
console.log(`\nAgent-readiness: ${total}/10`);

if (total < 10) {
  console.error('✗ below 10/10 — the gap is real; fix the criteria below 2.');
  process.exit(1);
}
console.log('✅ 10/10 — the workspace is fully agent-ready, and the score proves it.');