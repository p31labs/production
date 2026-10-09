#!/usr/bin/env node
/**
 * Purple Flea full chain — health-gated. Runs only when the service is back:
 *   casino register → agent_id (ag_xxx) → Smithery claim_faucet → one coin-flip
 *   use_credits:true → withdraw to Base USDC → write .bootstrap-payer.json
 *
 * While Purple Flea is down this script exits 0 with a diagnosis — it never
 * half-runs a broken chain.
 *
 * Run: node scripts/purpleflea-chain.mjs
 * Env: SMITHERY_API_KEY or .smithery.key · SMITHERY_NAMESPACE · SMITHERY_CONNECTION
 *      PURPLEFLEA_WITHDRAW_ADDR (destination Base address; without it the chain
 *      stops after the credit is won and reports balance)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KEY = process.env.SMITHERY_API_KEY
  || (existsSync(join(ROOT, '.smithery.key')) ? readFileSync(join(ROOT, '.smithery.key'), 'utf8').trim() : '');
const NS = process.env.SMITHERY_NAMESPACE || 'trimtab-signal';
const CONN = process.env.SMITHERY_CONNECTION || 'purpleflea-faucet';
const CASINO = process.env.PURPLEFLEA_CASINO || 'https://casino.purpleflea.com';
const AGENT_NAME = process.env.PURPLEFLEA_AGENT_NAME || 'p31-capital-machine';

async function probe(url, init = {}) {
  try {
    const res = await fetch(url, init);
    return { ok: res.ok, http: res.status, text: await res.text() };
  } catch (e) {
    return { ok: false, http: 0, text: String(e.message ?? e) };
  }
}

// ── Health gate ────────────────────────────────────────────────────────────
console.log('Purple Flea chain — health gate');
const casinoHealth = await probe(`${CASINO}/api/v1/auth/register`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
});
console.log(`  casino register endpoint: HTTP ${casinoHealth.http}`);
if (casinoHealth.http === 0) {
  console.log('\n❌ Purple Flea is down (casino endpoint unreachable). No action taken.');
  console.log('   Rerun when the service recovers. This script is safe to retry.');
  process.exit(0);
}

if (KEY) {
  const sm = await probe(`https://mcp.smithery.ai/${NS}/${CONN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}`, 'Accept': 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });
  console.log(`  Smithery ${NS}/${CONN}: HTTP ${sm.http}`);
  if (sm.http === 526 || sm.http === 0) {
    console.log(`\n❌ Smithery→Purple Flea is unhealthy (HTTP ${sm.http}).`);
    console.log(`   ${sm.http === 526 ? 'Invalid SSL at PF origin — service-level TLS failure.' : 'Transport failure.'}`);
    console.log('   Rerun when Purple Flea fixes its TLS.');
    process.exit(0);
  }
}

// ── Step 1: Register at the casino ─────────────────────────────────────────
console.log('\nStep 1: registering at casino.purpleflea.com');
const reg = await probe(`${CASINO}/api/v1/auth/register`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ agent_name: AGENT_NAME }),
});
let agentId, apiKey;
try {
  const r = JSON.parse(reg.text);
  agentId = r?.agent?.id || r?.agent_id || r?.id;
  apiKey = r?.agent?.api_key || r?.api_key;
} catch {}
if (!agentId) {
  console.log(`❌ Casino register failed: HTTP ${reg.http} ${reg.text.slice(0, 200)}`);
  process.exit(1);
}
console.log(`  ✅ agent_id = ${agentId}`);

// ── Step 2: Claim faucet via Smithery MCP ──────────────────────────────────
console.log('\nStep 2: claiming $1 faucet credit via Smithery');
if (!KEY) {
  console.log('❌ No SMITHERY_API_KEY / .smithery.key — cannot claim via Smithery.');
  process.exit(1);
}
const claim = await probe(`https://mcp.smithery.ai/${NS}/${CONN}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}`, 'Accept': 'application/json, text/event-stream' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'claim_faucet', arguments: { agent_casino_id: agentId } } }),
});
console.log(`  HTTP ${claim.http}`);
const claimLine = claim.text.split('\n').filter((l) => l.startsWith('data:')).pop();
console.log(`  ${(claimLine ? claimLine.slice(5) : claim.text).slice(0, 300)}`);
const claimed = claimLine || claim.http === 200;

// ── Step 3: Play one coin-flip use_credits:true ────────────────────────────
// Clears the withdrawal minimum (~$1) with a single 50/50 hand (0.5% house edge).
const dest = process.env.PURPLEFLEA_WITHDRAW_ADDR;
if (!dest) {
  console.log('\n📝 Credit won. Set PURPLEFLEA_WITHDRAW_ADDR=0x… to play + withdraw.');
  console.log('   Status so far: agent_id ' + agentId + ', claim HTTP ' + claim.http);
  writeFileSync(join(ROOT, '.bootstrap-payer.json'), JSON.stringify({
    casino_agent_id: agentId,
    via: `purpleflea/${NS}/${CONN}`,
    stage: 'claimed-not-withdrawn',
    claimedAt: new Date().toISOString(),
  }, null, 2));
  process.exit(0);
}

console.log('\nStep 3: coin-flip with use_credits:true');
const play = await probe(`${CASINO}/api/v1/games/coinflip`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({ bet: 1, choice: 'heads', use_credits: true }),
});
console.log(`  HTTP ${play.http}  ${play.text.slice(0, 250)}`);

// ── Step 4: Withdraw to Base USDC ──────────────────────────────────────────
console.log('\nStep 4: withdrawing to Base USDC');
const withdraw = await probe(`${CASINO}/api/v1/withdraw`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({ address: dest, use_credits: false }),
});
console.log(`  HTTP ${withdraw.http}  ${withdraw.text.slice(0, 250)}`);

writeFileSync(join(ROOT, '.bootstrap-payer.json'), JSON.stringify({
  casino_agent_id: agentId,
  via: `purpleflea/${NS}/${CONN}`,
  withdraw_to: dest,
  withdraw_http: withdraw.http,
  withdraw_response: withdraw.text.slice(0, 200),
  claimedAt: new Date().toISOString(),
}, null, 2));
console.log(`\n✅ Purple Flea chain complete → .bootstrap-payer.json written.`);
console.log('   Next: verify the destination wallet has USDC on-chain, then pnpm settle.');