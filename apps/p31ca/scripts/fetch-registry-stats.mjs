#!/usr/bin/env node
/**
 * fetch-registry-stats.mjs — Refresh ground-truth/content/registry-stats.json
 * from the live MCP registry.
 *
 * Source: GET https://mcp-registry.trimtab-signal.workers.dev/servers
 *   → { servers: [ { status, toolCount, tools } ... ] }
 *
 * registry-stats.json is the offline fallback the hub home reads when the
 * registry is unreachable at build time. Aggregates three numbers:
 *   servers — total registered servers
 *   live    — servers with status === 'live'
 *   tools   — sum of tool counts across all servers
 *
 * Usage:
 *   node scripts/fetch-registry-stats.mjs          # skip if within threshold
 *   node scripts/fetch-registry-stats.mjs --force  # fetch regardless
 *
 * Fail-closed: a failed or malformed fetch exits 1 and does NOT overwrite
 * the file. lastVerified is only bumped when values were actually read.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = resolve(__dirname, '..', 'ground-truth', 'content');
const REGISTRY_PATH = resolve(CONTENT_DIR, 'registry-stats.json');
const FORCE = process.argv.includes('--force');
const SOURCE = 'https://mcp-registry.trimtab-signal.workers.dev/servers';

function toolCountOf(server) {
  const explicit = Number(server?.toolCount);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  if (Array.isArray(server?.tools)) return server.tools.length;
  return 0;
}

async function main() {
  console.log('P31 MCP-registry stats freshener\n');

  const current = JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'));
  const thresholdDays = current.stalenessThreshold ?? 30;
  const hoursAgo = (Date.now() - new Date(current.lastVerified).getTime()) / 36e5;

  if (!FORCE && hoursAgo < thresholdDays * 24) {
    console.log(`registry-stats.json verified ${hoursAgo.toFixed(1)}h ago (threshold: ${thresholdDays * 24}h). Skipping.`);
    console.log('Use --force to override.');
    return;
  }

  console.log(`[registry] GET ${SOURCE}`);
  const res = await fetch(SOURCE, {
    headers: { 'User-Agent': 'P31-ContentFreshener/1.0 (mailto:hello@p31ca.org)' },
  });
  if (!res.ok) throw new Error(`${SOURCE} returned ${res.status}`);

  const data = await res.json();
  const servers = Array.isArray(data) ? data : data?.servers;
  if (!Array.isArray(servers)) throw new Error('malformed registry payload: no servers array');

  const next = {
    schema: current.schema,
    version: current.version,
    lastVerified: new Date().toISOString(),
    stalenessThreshold: thresholdDays,
    source: SOURCE,
    servers: servers.length,
    live: servers.filter((s) => s?.status === 'live').length,
    tools: servers.reduce((sum, s) => sum + toolCountOf(s), 0),
    note: current.note,
  };

  writeFileSync(REGISTRY_PATH, JSON.stringify(next, null, 2) + '\n');
  console.log(`  wrote ${REGISTRY_PATH}`);
  console.log(`  servers=${next.servers} live=${next.live} tools=${next.tools}`);
}

main().catch((err) => {
  console.error(`\n❌ registry fetch FAILED (file NOT overwritten): ${err.message}`);
  process.exit(1);
});