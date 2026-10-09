#!/usr/bin/env node
/**
 * Bootstrap Orchestrator — the "agent helper fund" in one command.
 *
 * Primary path: x711.io — onboard → API key → dedicated Base wallet ($0.50 USDC
 * + free ETH gas) → export private key → verify on-chain before declaring a winner.
 *
 * Fallbacks (health-gated; never silent winners):
 *   - Purple Flea (direct + Smithery) — service-down detection (526 / unreachable)
 *   - minia2a — internal credits only; never written as payer (not mainnet USDC)
 *
 * Run: node scripts/bootstrap-orchestrator.mjs [--name p31-capital-machine]
 * Writes: .bootstrap-payer.json (only when on-chain USDC + ETH verified)
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPublicClient, http, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const PAYER_FILE = join(ROOT, '.bootstrap-payer.json');
const GITIGNORE = join(ROOT, '.gitignore');
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const RPC = process.env.RPC_URL || 'https://base-rpc.publicnode.com';
const MIN_USDC_ATOMIC = 20000n; // $0.02 — P31's revenue.getSummary price

const name = process.argv.includes('--name')
  ? process.argv[process.argv.indexOf('--name') + 1]
  : 'p31-capital-machine';

// Refuse to write credentials unless gitignored.
const gitignore = existsSync(GITIGNORE) ? readFileSync(GITIGNORE, 'utf8') : '';
if (!gitignore.includes('.bootstrap-payer.json')) {
  console.error('❌ .bootstrap-payer.json is not gitignored — add it first.');
  process.exit(1);
}

const publicClient = createPublicClient({ chain: base, transport: http(RPC) });
const ERC20_BALANCE_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
];

async function probe(url, init = {}) {
  try {
    const res = await fetch(url, init);
    const text = await res.text();
    return { ok: res.ok, http: res.status, text };
  } catch (e) {
    return { ok: false, http: 0, text: String(e.message ?? e) };
  }
}

/** Verify on-chain: ETH gas > 0 AND USDC >= min. Returns {ok, eth, usdc, error}. */
async function verifyOnChain(address) {
  try {
    const [ethWei, usdcRaw] = await Promise.all([
      publicClient.getBalance({ address }),
      publicClient.readContract({ address: USDC, abi: ERC20_BALANCE_ABI, functionName: 'balanceOf', args: [address] }),
    ]);
    const eth = formatUnits(ethWei, 18);
    const usdc = Number(BigInt(usdcRaw)) / 1e6;
    return { ok: ethWei > 0n && BigInt(usdcRaw) >= MIN_USDC_ATOMIC, eth, usdc };
  } catch (e) {
    return { ok: false, eth: '0', usdc: 0, error: String(e.message ?? e).slice(0, 80) };
  }
}

/** x711 — full chain: onboard → wallet → export → on-chain verify. PRIMARY. */
async function tryX711Full() {
  const onboard = await probe('https://x711.io/api/onboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, framework: 'node' }),
  });
  if (!onboard.ok) return { ok: false, http: onboard.http, detail: `onboard HTTP ${onboard.http}: ${onboard.text.slice(0, 100)}`, grant: '$0.50 + gas' };

  let data;
  try { data = JSON.parse(onboard.text); } catch { return { ok: false, http: onboard.http, detail: 'onboard non-json', grant: '$0.50 + gas' }; }
  const apiKey = data.api_key || data.apiKey || data.key || data.data?.api_key;
  if (!apiKey) return { ok: false, http: onboard.http, detail: 'onboard returned no api_key', grant: '$0.50 + gas' };

  // Fetch the dedicated Base wallet.
  const w = await probe('https://x711.io/api/wallet', { headers: { 'X-API-Key': apiKey } });
  let walletAddress = data.wallet_address || data.walletAddress;
  if (w.ok) {
    try {
      const wj = JSON.parse(w.text);
      walletAddress = wj.wallet_address || wj.address || wj.walletAddress || walletAddress;
    } catch {}
  }
  if (!walletAddress) return { ok: false, http: 0, detail: 'no wallet address from x711', grant: '$0.50 + gas' };

  // Only export a key once the wallet is funded on-chain (avoid orphan keys).
  const pre = await verifyOnChain(walletAddress);
  if (!pre.ok) {
    const why = pre.error ? ` (${pre.error})` : '';
    return { ok: false, http: 0, detail: `wallet ${walletAddress.slice(0, 10)}… has ${pre.usdc} USDC / ${pre.eth} ETH — not yet funded${why}`, grant: '$0.50 + gas' };
  }

  const exp = await probe('https://x711.io/api/wallet/export', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey }, body: '{}',
  });
  if (!exp.ok) return { ok: false, http: exp.http, detail: `export HTTP ${exp.http} — wallet funded but key not exportable via API`, grant: '$0.50 + gas' };
  let exported;
  try { exported = JSON.parse(exp.text); } catch { return { ok: false, http: exp.http, detail: 'export non-json', grant: '$0.50 + gas' }; }
  const pk = exported.private_key || exported.privateKey || exported.key;
  if (!pk) return { ok: false, http: exp.http, detail: 'export returned no private_key', grant: '$0.50 + gas' };

  // The exported key must control the funded address.
  const acct = privateKeyToAccount(pk.startsWith('0x') ? pk : `0x${pk}`);
  if (acct.address.toLowerCase() !== walletAddress.toLowerCase()) {
    return { ok: false, http: 0, detail: `exported key address ${acct.address} ≠ wallet ${walletAddress}`, grant: '$0.50 + gas' };
  }
  const post = await verifyOnChain(acct.address);
  if (!post.ok) return { ok: false, http: 0, detail: `post-export check failed: ${post.usdc} USDC / ${post.eth} ETH`, grant: '$0.50 + gas' };

  return {
    ok: true, http: 200,
    detail: `${acct.address.slice(0, 10)}… · ${post.usdc.toFixed(4)} USDC · ${Number(post.eth).toFixed(6)} ETH`,
    grant: '$0.50 + gas', privateKey: pk, address: acct.address,
  };
}

/** Purple Flea — service-down detection only. Never a silent winner. */
async function tryPurpleFlea() {
  const direct = await probe('https://faucet.purpleflea.com/v1/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const casino = await probe('https://casino.purpleflea.com/api/v1/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  if (direct.http === 0 && casino.http === 0) {
    return { ok: false, http: 0, detail: 'service down (all purpleflea.com domains unreachable)', grant: '$1 casino credit' };
  }
  return { ok: false, http: direct.http, detail: `faucet HTTP ${direct.http} / casino HTTP ${casino.http} — service not usable`, grant: '$1 casino credit' };
}

/** minia2a — internal credits, not mainnet USDC. Reported but never a payer. */
async function tryMiniA2a() {
  return { ok: false, http: 0, detail: 'internal credits (not spendable USDC on Base) — excluded from payer', grant: '500 internal credits' };
}

console.log(`\nP31 Bootstrap Orchestrator (name: ${name})\n${'='.repeat(64)}`);

const paths = [
  { name: 'x711.io (PRIMARY)', run: tryX711Full },
  { name: 'Purple Flea', run: tryPurpleFlea },
  { name: 'minia2a', run: tryMiniA2a },
];

let winner = null;
for (const p of paths) {
  const r = await p.run();
  const mark = r.ok ? '✅' : (r.detail?.includes('down') || r.detail?.includes('excluded')) ? '⚠️' : '❌';
  console.log(`${mark} ${p.name.padEnd(22)} HTTP ${String(r.http).padEnd(4)} ${r.detail}`);
  if (r.ok && !winner) winner = { path: p.name, ...r };
}

if (winner) {
  writeFileSync(PAYER_FILE, JSON.stringify({
    address: winner.address,
    privateKey: winner.privateKey,
    grant: winner.grant,
    via: winner.path,
    claimedAt: new Date().toISOString(),
  }, null, 2));
  console.log(`\n✅ ${winner.path} — funded payer written → .bootstrap-payer.json`);
  console.log(`   ${winner.detail}`);
  console.log(`\nNext: pnpm settle  (settles one revenue.getSummary → Bazaar indexes P31)`);
} else {
  console.log(`\n⚠️ No on-chain-funded payer this run.`);
  console.log(`   • x711.io is the primary path — wallet credits auto-land in ~60s; retry.`);
  console.log(`   • Purple Flea is down at the service level (526 / domains unreachable).`);
  console.log(`   • minia2a credits are internal — not mainnet USDC.`);
  console.log(`\nRerun: node scripts/bootstrap-orchestrator.mjs --name ${name}`);
  process.exit(1);
}