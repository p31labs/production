#!/usr/bin/env node
/**
 * First Settle — the one-command action that indexes P31 in the x402 Bazaar.
 *
 * Ready to run the moment a payer wallet holds ANY real USDC on Base mainnet.
 * Payer key is read from .bootstrap-payer.json (written by bootstrap-orchestrator)
 * or PAYER_PRIVATE_KEY. USDC domain per EIP-3009 on Base: name "USD Coin",
 * version "2", chainId 8453.
 *
 * Run: node scripts/first-settle.mjs
 */
import { createWalletClient, createPublicClient, http, parseAbi, encodeAbiParameters, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const RESOURCE = process.env.RESOURCE_URL || 'https://p31-capital-machine-mcp.trimtab-signal.workers.dev/resources/revenue.getSummary';
const FACILITATOR = 'https://api.cdp.coinbase.com/platform/v2/x402';
const PORTAL = 'https://p31-monetization.trimtab-signal.workers.dev';
const RPC = process.env.RPC_URL || 'https://base-rpc.publicnode.com';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

let key = process.env.PAYER_PRIVATE_KEY;
if (!key) {
  const payerFile = join(ROOT, '.bootstrap-payer.json');
  if (existsSync(payerFile)) {
    const payer = JSON.parse(readFileSync(payerFile, 'utf8'));
    key = payer.privateKey;
  }
}
if (!key) {
  console.error('No payer key. Run scripts/bootstrap-orchestrator.mjs first, or set PAYER_PRIVATE_KEY.');
  process.exit(1);
}

const account = privateKeyToAccount(key);
const wallet = createWalletClient({ account, chain: base, transport: http(RPC) });
console.log(`Payer: ${account.address}`);

/** On-chain preflight — fail fast (and with a clear next step) before signing. */
const publicClient = createPublicClient({ chain: base, transport: http(RPC) });
const ERC20_BALANCE_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
];
try {
  const [ethWei, usdcRaw] = await Promise.all([
    publicClient.getBalance({ address: account.address }),
    publicClient.readContract({ address: USDC, abi: ERC20_BALANCE_ABI, functionName: 'balanceOf', args: [account.address] }),
  ]);
  const usdcAtomic = BigInt(usdcRaw);
  const eth = formatUnits(ethWei, 18);
  const usdc = Number(usdcAtomic) / 1e6;
  console.log(`On-chain: ${usdc} USDC · ${eth} ETH`);
  if (ethWei === 0n) {
    console.error('❌ Payer has no ETH for gas. Run: pnpm bootstrap (x711 gives free gas).');
    process.exit(1);
  }
  const need = process.env.MIN_USDC_ATOMIC ? BigInt(process.env.MIN_USDC_ATOMIC) : 1n;
  if (usdcAtomic < need) {
    console.error(`❌ Payer USDC ${usdc} < required ${Number(need) / 1e6}. Run: pnpm bootstrap.`);
    process.exit(1);
  }
  console.log('✅ Payer funded — proceeding to sign and settle.');
} catch (e) {
  console.error('Preflight failed (RPC unreachable?):', e instanceof Error ? e.message : e);
  process.exit(1);
}

/** EIP-3009 TransferWithAuthorization — the exact typed-data for USDC on Base. */
const EIP3009_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
};
const DOMAIN = { name: 'USD Coin', version: '2', chainId: 8453, verifyingContract: USDC };

async function getAccept() {
  const res = await fetch(RESOURCE, { headers: { Accept: 'application/json' } });
  const body = await res.json();
  const accept = body?.accepts?.[0];
  if (!accept) throw new Error(`Expected 402 with accepts; got HTTP ${res.status}`);
  return accept;
}

/** Sign the EIP-3009 authorization for the accepted payment requirement. */
async function signAuthorization(accept) {
  const now = Math.floor(Date.now() / 1000);
  const message = {
    from: account.address,
    to: accept.payTo,
    value: BigInt(accept.maxAmountRequired),
    validAfter: 0,
    validBefore: now + 3600,
    nonce: '0x' + crypto.randomUUID().replace(/-/g, ''),
  };
  const signature = await wallet.signTypedData({ account, domain: DOMAIN, types: EIP3009_TYPES, primaryType: 'TransferWithAuthorization', message });
  return { message, signature };
}

async function settle(accept, auth) {
  const payload = {
    scheme: accept.scheme,
    network: accept.network,
    asset: accept.asset,
    resource: accept.resource,
    description: accept.description,
    payTo: accept.payTo,
    maxAmountRequired: accept.maxAmountRequired,
    authorizationType: 'eip3009',
    ...auth,
  };
  const verify = await fetch(`${FACILITATOR}/verify`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  const v = await verify.json();
  console.log('verify:', verify.status, JSON.stringify(v).slice(0, 120));
  if (!verify.ok) return false;
  const settle = await fetch(`${FACILITATOR}/settle`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  const s = await settle.json();
  console.log('settle:', settle.status, JSON.stringify(s).slice(0, 120));
  return settle.ok;
}

async function confirm() {
  const chain = await fetch(`${PORTAL}/api/revenue/verify-chain`).then((r) => r.json());
  console.log('Revenue chain:', chain.valid ? 'VALID' : 'FAIL', '· entries:', chain.total_entries);
}

try {
  const accept = await getAccept();
  console.log('402 challenge:', accept.description, '·', accept.maxAmountRequired, 'atomic ·', accept.network);
  if (process.env.DRY_RUN) { console.log('dry-run OK'); process.exit(0); }
  const auth = await signAuthorization(accept);
  const ok = await settle(accept, auth);
  if (ok) await confirm();
  else { console.error('Settlement rejected — verify request shape vs the facilitator spec.'); process.exit(1); }
} catch (e) {
  console.error('Settle failed:', e instanceof Error ? e.message : e);
  process.exit(1);
}