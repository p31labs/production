#!/usr/bin/env node
/**
 * @p31ca/canon — record-verified.mjs
 *
 * Binds a `verified` contract to the component it verified. Computes SHA-256
 * over the component source (BOM stripped, CRLF/CR → LF — KIN's normalization)
 * and writes it into the contract's `verifiedHash`/`verifiedAt` fields.
 *
 * Run after a green parity run. verify-contract.mjs then enforces the other
 * half: recompute the hash, and DEMOTE any `verified` contract whose component
 * has drifted.
 *
 * Usage: node scripts/record-verified.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const canon = resolve(here, '..');
const designCore = resolve(canon, '..', 'design-core');
const contractsDir = join(canon, 'src', 'contracts');

function normalize(bytes) {
  let s = bytes.toString('utf8');
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1); // strip BOM
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function sha256(file) {
  return createHash('sha256').update(normalize(readFileSync(file))).digest('hex');
}

const now = new Date().toISOString();
let recorded = 0;

for (const f of readdirSync(contractsDir)) {
  if (!f.endsWith('.contract.ts')) continue;
  const path = join(contractsDir, f);
  let text = readFileSync(path, 'utf8');
  if (!/status: 'verified'/.test(text)) continue;

  const nameMatch = text.match(/name: '([A-Za-z0-9]+)'/);
  if (!nameMatch) { console.error(`✗ ${f}: no name`); continue; }
  const name = nameMatch[1];
  const comp = join(designCore, 'src', 'compositions', `${name}.tsx`);
  let hash;
  try { hash = sha256(comp); } catch (e) { console.error(`✗ ${f}: ${e.message}`); continue; }

  // Replace any existing verifiedHash/verifiedAt, then inject after status.
  text = text.replace(/\n  verifiedHash: '[a-f0-9]{64}',\n/, '').replace(/\n  verifiedAt: '[^']*',\n/, '');
  text = text.replace(
    /status: 'verified',/,
    `status: 'verified',\n\n  verifiedHash: '${hash}',\n  verifiedAt: '${now}',`,
  );
  writeFileSync(path, text);
  console.log(`✓ ${name} → ${hash}`);
  recorded++;
}

console.log(`\nrecorded ${recorded} verified hash(es)`);