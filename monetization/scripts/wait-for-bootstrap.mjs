#!/usr/bin/env node
/**
 * wait-for-bootstrap — polls every zero-cost path until one recovers, then
 * runs the full onboard → export → verify → settle chain and logs the result.
 *
 * Run in the background:
 *   nohup node scripts/wait-for-bootstrap.mjs --max-minutes 1440 > /tmp/p31-bootstrap.log 2>&1 &
 *
 * Env: POLL_MINUTES (default 5) · cap via --max-minutes (default 1440 = 24h)
 * State persisted to .bootstrap-wait.json (gitignored alongside the payer file).
 * Exit codes: 0 success (payer funded + settled) · 1 cap reached · 2 fatal
 */
import { writeFileSync, readFileSync, existsSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOG = join(ROOT, '.bootstrap-wait.log');
const STATE = join(ROOT, '.bootstrap-wait.json');
const GITIGNORE = join(ROOT, '.gitignore');

const gi = existsSync(GITIGNORE) ? readFileSync(GITIGNORE, 'utf8') : '';
if (!gi.includes('.bootstrap-wait.json')) {
  appendFileSync(GITIGNORE, '\n.bootstrap-wait.json\n.bootstrap-wait.log\n');
}

const intervalMin = Number(process.env.POLL_MINUTES || 5);
const capMin = Number(
  process.argv.includes('--max-minutes')
    ? process.argv[process.argv.indexOf('--max-minutes') + 1]
    : 1440,
);
const startedAt = Date.now();

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  appendFileSync(LOG, line + '\n');
}

function saveState(s) {
  writeFileSync(STATE, JSON.stringify({ ...s, startedAt, updatedAt: Date.now() }, null, 2));
}

async function probe(url, init = {}, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal });
    return { ok: r.ok, http: r.status, text: await r.text() };
  } catch (e) {
    return { ok: false, http: 0, text: String(e.message ?? e) };
  } finally {
    clearTimeout(t);
  }
}

async function healthX711() {
  const r = await probe('https://x711.io/api/onboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'p31-capital-machine', framework: 'node' }),
  });
  return { up: r.ok && !/503|unavailable|insert failed/i.test(r.text), http: r.http };
}

async function healthPurpleFlea() {
  const r = await probe('https://casino.purpleflea.com/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  return { up: r.http !== 0 && r.http !== 526, http: r.http };
}

async function healthSmithery() {
  const key = existsSync(join(ROOT, '.smithery.key'))
    ? readFileSync(join(ROOT, '.smithery.key'), 'utf8').trim()
    : '';
  if (!key) return { up: false, http: 0 };
  const r = await probe('https://mcp.smithery.ai/trimtab-signal/purpleflea-faucet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });
  return { up: r.ok, http: r.http };
}

function trySettle() {
  try {
    const out = execSync('node scripts/first-settle.mjs', { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
    log(`settle output: ${out.slice(0, 400)}`);
    return /VALID/.test(out) && !/no ETH for gas|no.*USDC/i.test(out);
  } catch (e) {
    log(`settle failed: ${String(e.message ?? e).slice(0, 200)}`);
    return false;
  }
}

function tryBootstrap() {
  try {
    const out = execSync('node scripts/bootstrap-orchestrator.mjs --name p31-capital-machine', { cwd: ROOT, encoding: 'utf8', timeout: 90000 });
    log(`bootstrap output: ${out.slice(0, 500)}`);
    return /funded payer written/.test(out);
  } catch (e) {
    log(`bootstrap failed: ${String(e.message ?? e).slice(0, 200)}`);
    return false;
  }
}

log(`wait-for-bootstrap started — poll ${intervalMin}min · cap ${capMin}min`);
saveState({ status: 'polling', x711: null, purpleflea: null, smithery: null });

let lastX711 = null, lastPF = null, lastSm = null;

while ((Date.now() - startedAt) / 60000 < capMin) {
  const [x711, pf, sm] = await Promise.all([healthX711(), healthPurpleFlea(), healthSmithery()]);

  if (x711.up !== lastX711) log(`x711 ${x711.up ? 'UP' : 'down'} (HTTP ${x711.http})`);
  if (pf.up !== lastPF) log(`purple-flea ${pf.up ? 'UP' : 'down'} (HTTP ${pf.http})`);
  if (sm.up !== lastSm) log(`smithery ${sm.up ? 'UP' : 'down'} (HTTP ${sm.http})`);
  lastX711 = x711.up; lastPF = pf.up; lastSm = sm.up;

  saveState({
    status: 'polling',
    x711, purpleflea: pf, smithery: sm,
    elapsedMinutes: Math.floor((Date.now() - startedAt) / 60000),
  });

  if (x711.up || pf.up) {
    log('service recovered — attempting bootstrap');
    if (tryBootstrap()) {
      log('payer funded — attempting settle');
      if (trySettle()) {
        log('✅ SETTLED — Bazaar should index within minutes');
        saveState({ status: 'settled', at: Date.now() });
        process.exit(0);
      }
    }
  }

  await new Promise((r) => setTimeout(r, intervalMin * 60000));
}

log(`cap reached (${capMin}min) — exiting`);
saveState({ status: 'cap-reached' });
process.exit(1);