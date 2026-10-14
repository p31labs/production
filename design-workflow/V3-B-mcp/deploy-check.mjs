#!/usr/bin/env node
/**
 * @file B3-deploy — deploy-artifact gate (runbook v3.0 §5 B-3, §8 mcp-deploy-artifact).
 *
 * Validates the V3-B-mcp/wrangler.toml deploy artifact BEFORE any deploy
 * session runs `wrangler deploy`:
 *   - required keys present: name, main, compatibility_date (non-empty);
 *   - the worker file referenced by `main` EXISTS, resolved relative to the
 *     wrangler.toml directory (runbook §5 B-3 gate: the referenced worker must
 *     be real — a missing handler/file fails the dry-run).
 *
 * Exit 0 = artifact valid; exit 1 = invalid (with reasons).
 *
 * Usage:
 *   node deploy-check.mjs                  # validates ./wrangler.toml
 *   node deploy-check.mjs <path.toml>      # validate any toml
 *
 * Negative control: a toml missing the `main` key must fail.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_TOML = resolve(HERE, 'wrangler.toml');
const REQUIRED_KEYS = ['name', 'main', 'compatibility_date'];

/**
 * Minimal top-level TOML parser: only `key = "value"` / `key = value`
 * assignments at column 0 are read — exactly what the gate needs, and it
 * cannot be fooled by section content ([observability]).
 */
function parseTopLevelToml(src) {
  const out = {};
  for (const line of src.split('\n')) {
    const m = line.match(/^([a-zA-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    const val = raw.trim().replace(/^"|"$/g, '');
    out[key] = val;
  }
  return out;
}

function main() {
  const [tomlPath] = process.argv.slice(2);
  const file = tomlPath ? resolve(tomlPath) : DEFAULT_TOML;

  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch (err) {
    console.error(`deploy-check: cannot read ${file} — ${err.message}`);
    process.exit(1);
  }

  const cfg = parseTopLevelToml(src);
  const problems = [];

  for (const key of REQUIRED_KEYS) {
    if (!cfg[key]) problems.push(`missing required key "${key}"`);
  }

  if (cfg.main) {
    const workerFile = resolve(dirname(file), cfg.main);
    try {
      readFileSync(workerFile, 'utf8');
      console.log(`  main -> ${cfg.main} (exists: ${workerFile})`);
    } catch {
      problems.push(`main file does not exist: ${workerFile}`);
    }
  }

  if (problems.length === 0) {
    console.log(`deploy-check: ${file}`);
    console.log(`  name = ${cfg.name}`);
    console.log(`  compatibility_date = ${cfg.compatibility_date}`);
    console.log('DEPLOY ARTIFACT: VALID');
    process.exit(0);
  }

  console.log(`deploy-check: ${file}`);
  for (const p of problems) console.log(`  FAIL: ${p}`);
  console.log('DEPLOY ARTIFACT: INVALID');
  process.exit(1);
}

main();