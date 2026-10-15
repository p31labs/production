#!/usr/bin/env node
/**
 * d1-auth-bootstrap.mjs — P0-2 automation: create the AUTH_DB D1 database,
 * patch the REPLACE_ME_WITH_D1_ID placeholder in wrangler.toml, and apply the
 * auth schema migration. Idempotent — safe to re-run.
 *
 * Usage (from monetization/):  node scripts/d1-auth-bootstrap.mjs
 * Requires: authenticated wrangler (wrangler whoami).
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const MONET = dirname(dirname(fileURLToPath(import.meta.url)));
const WRANGLER_TOML = join(MONET, 'wrangler.toml');
const MIGRATION = join(MONET, 'migrations', '0001_auth.sql');
const DB_NAME = 'p31-monetization-auth';
const PLACEHOLDER = 'REPLACE_ME_WITH_D1_ID';

function wrangler(args, opts = {}) {
  return execSync(`npx wrangler ${args}`, { cwd: MONET, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

const list = wrangler('d1 list');
const existingId = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/.test(list)
  ? list.match(new RegExp(`([0-9a-f-]{36}).*?\\b${DB_NAME}\\b`))?.[1] || null
  : null;

// A name match in the table: uuid column precedes name column.
const nameRow = list.split('\n').find((l) => l.includes(DB_NAME));
const liveId = nameRow ? (nameRow.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/) || [])[0] : undefined;

let databaseId = liveId;
if (!databaseId) {
  console.log(`  creating D1 database "${DB_NAME}"...`);
  const out = wrangler(`d1 create ${DB_NAME}`);
  const m = out.match(/database_id\s*=\s*"([0-9a-f-]+)"/);
  if (!m) throw new Error('could not parse database_id from `wrangler d1 create` output:\n' + out);
  databaseId = m[1];
  console.log(`  created ${DB_NAME} → ${databaseId}`);
} else {
  console.log(`  ${DB_NAME} already exists → ${databaseId}`);
}

// Patch the placeholder (idempotent).
let toml = readFileSync(WRANGLER_TOML, 'utf8');
if (toml.includes(PLACEHOLDER)) {
  toml = toml.replace(`database_id = "${PLACEHOLDER}"`, `database_id = "${databaseId}"`);
  writeFileSync(WRANGLER_TOML, toml);
  console.log(`  patched ${WRANGLER_TOML.replace(MONET, '.')}: placeholder → ${databaseId}`);
} else if (toml.includes(`database_id = "${databaseId}"`)) {
  console.log('  wrangler.toml already has the real database_id — nothing to patch.');
} else {
  console.warn('  ⚠ wrangler.toml has an AUTH_DB id that is neither the placeholder nor the created id — manual reconciliation needed.');
}

// Apply the auth schema migration (CREATE TABLE IF NOT EXISTS — safe to re-run).
if (databaseId) {
  console.log(`  applying ${MIGRATION.replace(MONET, '.')} → ${DB_NAME} (remote)...`);
  wrangler(`d1 execute ${DB_NAME} --remote --file=${MIGRATION}`);
  console.log('  migration applied.');
}

console.log(`\nDONE — AUTH_DB=${databaseId}`);
console.log('Next: `wrangler deploy` from monetization/ (see scripts/deploy-live.sh).');