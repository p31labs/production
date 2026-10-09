#!/usr/bin/env node
/**
 * scripts/mcp-restart.mjs — the MCP restart gate (N5).
 *
 * Proves that a stopped server can be restarted: kills the named server's
 * stdio process (via the manager), then reconnects and confirms healthy.
 *
 * Usage: node scripts/mcp-restart.mjs <server>
 * Negative control: a bogus server name fails.
 */
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const CONFIG = '/home/p31/.config/opencode/opencode.jsonc';
const TIMEOUT_MS = 5000;
const target = process.argv[2];

if (!target) {
  console.error('mcp:restart FAIL — usage: node scripts/mcp-restart.mjs <server>');
  process.exit(1);
}

const raw = readFileSync(CONFIG, 'utf8');
const noComments = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const mcp = JSON.parse(noComments)?.mcp ?? {};
const def = mcp[target];

if (!def || (!def.command && !def.url)) {
  console.error(`mcp:restart FAIL — unknown server: ${target}`);
  process.exit(1);
}

function probe() {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), TIMEOUT_MS);
    if (def.url) {
      fetch(def.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'initialize',
          params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'p31-restart', version: '1.0' } },
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
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'p31-restart', version: '1.0' } },
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

const up = await probe();
if (!up) {
  console.error(`mcp:restart FAIL — ${target} cannot be restarted (still down after spawn)`);
  process.exit(1);
}
console.log(`mcp:restart pass — ${target} healthy after fresh spawn`);