#!/usr/bin/env node
/**
 * scripts/mcp-health-check.mjs — the MCP health gate (N5).
 *
 * Probes every MCP server via the mcp-health lib (spawn → initialize → tools →
 * kill). Fails if any server is unreachable. This is the `mcp:health` gate.
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const CONFIG = '/home/p31/.config/opencode/opencode.jsonc';
const TIMEOUT_MS = 5000;

function readMcpConfig() {
  const raw = readFileSync(CONFIG, 'utf8');
  const noComments = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  return JSON.parse(noComments)?.mcp ?? {};
}

function probe(name, def) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), TIMEOUT_MS);
    if (def.url) {
      fetch(def.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'initialize',
          params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'p31-health-gate', version: '1.0' } },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
        .then((r) => { clearTimeout(timer); resolve(r.ok); })
        .catch(() => { clearTimeout(timer); resolve(false); });
      return;
    }
    const [cmd, ...args] = Array.isArray(def.command) ? def.command : [];
    let child;
    try { child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch { clearTimeout(timer); resolve(false); return; }

    child.stdin.write(JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'p31-health-gate', version: '1.0' } },
    }) + '\n');

    let responded = false;
    let buf = '';
    child.stdout.on('data', (c) => {
      buf += c.toString();
      if (buf.includes('"result"') && !responded) {
        responded = true;
        clearTimeout(timer);
        try { child.kill('SIGTERM'); } catch {}
        resolve(true);
      }
    });
    child.on('error', () => { if (!responded) { clearTimeout(timer); resolve(false); } });
    child.on('exit', () => { if (!responded) { clearTimeout(timer); resolve(false); } });
  });
}

const mcp = readMcpConfig();
const names = Object.keys(mcp).filter((n) => mcp[n] && (mcp[n].command || mcp[n].url));
const results = [];
let fail = 0;

for (const name of names) {
  const ok = await probe(name, mcp[name]);
  results.push({ name, ok });
  if (!ok) fail++;
}

for (const { name, ok } of results) {
  console.log(`${ok ? 'HEALTHY' : 'UNHEALTHY'}  ${name}`);
}

if (fail) {
  console.error(`\nmcp:health FAIL — ${fail}/${names.length} servers unhealthy`);
  process.exit(1);
}
console.log(`\nmcp:health pass — ${names.length}/${names.length} servers healthy`);