#!/usr/bin/env node
/**
 * scripts/verify-mcp-paths.mjs — the MCP path gate (N1).
 *
 * Reads opencode.jsonc, extracts every MCP server entrypoint, and asserts the
 * file exists. The negative control: a wrong path fails.
 *
 * Usage: node scripts/verify-mcp-paths.mjs [configPath]
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CONFIG = process.argv[2] || '/home/p31/.config/opencode/opencode.jsonc';

if (!existsSync(CONFIG)) {
  console.error(`mcp:paths FAIL — config not found: ${CONFIG}`);
  process.exit(1);
}

const raw = readFileSync(CONFIG, 'utf8');
// Strip JSONC comments (// and /* */) for robust parsing.
const noComments = raw
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

let config;
try {
  config = JSON.parse(noComments);
} catch (e) {
  console.error(`mcp:paths FAIL — config not valid JSONC: ${e.message}`);
  process.exit(1);
}

const mcp = config?.mcp ?? {};
const entries = Object.entries(mcp).filter(([, v]) => v && (v.command || v.url));

let ok = 0;
let miss = 0;
const problems = [];

for (const [name, def] of entries) {
  if (def.url) {
    ok++; // remote URLs are reachable by definition; the health hook probes them
    console.log(`OK  ${name} (remote ${def.url.slice(0, 60)})`);
    continue;
  }
  const cmd = Array.isArray(def.command) ? def.command : [];
  const entrypoint = cmd.find((c) => /\.(js|mjs|ts)$/.test(String(c)));
  if (entrypoint && !existsSync(entrypoint)) {
    miss++;
    problems.push(`${name}: missing ${entrypoint}`);
    console.error(`MISS ${name} → ${entrypoint}`);
  } else {
    ok++;
    console.log(`OK  ${name} → ${entrypoint ?? '(no file entrypoint)'}`);
  }
}

if (miss > 0) {
  console.error(`\nmcp:paths FAIL — ${miss} missing entrypoints:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`\nmcp:paths pass — ${ok} servers resolve (${entries.length} configured)`);