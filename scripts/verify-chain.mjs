#!/usr/bin/env node
/**
 * verify-chain.mjs — the ledger integrity gate (W14).
 *
 * Recomputes the entire hash chain. If any entry was edited, deleted, inserted,
 * or reordered, the chain breaks and the gate fails.
 *
 * Negative control: a planted tamper in the ledger fails.
 *
 * Usage: node scripts/verify-chain.mjs
 */
import { verifyChain } from './lib/ledger.mjs';

const result = await verifyChain();
if (!result.valid) {
  console.error(`verify-chain: FAIL — ledger tampered (first bad seq ${result.firstBad})`);
  process.exit(1);
}
console.log(`verify-chain: pass — ${result.entries} entries, chain intact`);