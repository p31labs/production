#!/usr/bin/env node
/**
 * approve.mjs — the human approval CLI (W18).
 *
 * The human principal issues an approval token for a proposed consequential
 * action (soft-delete, hard-delete, merge). Ed25519-signed by the human's
 * key; the PQC (ML-DSA-65) component attaches when p31-crypto is reachable.
 *
 * Usage:
 *   node scripts/approve.mjs --proposal <id> --paths a,b --operation soft-delete
 *
 * The token is written to .workspace/tokens/<id>.token and the ledger gets an
 * `approve` entry.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const TOKENS_DIR = join(ROOT, '.workspace', 'tokens');

function parseArgs(argv) {
  const args = { proposal: null, paths: [], operation: null, issuer: 'did:key:will' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--proposal') args.proposal = argv[++i];
    else if (a === '--paths') args.paths = (argv[++i] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--operation') args.operation = argv[++i];
    else if (a === '--issuer') args.issuer = argv[++i];
    else if (a === '--list') args.list = true;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.list) {
  if (existsSync(TOKENS_DIR)) {
    for (const f of readdirSync(TOKENS_DIR)) {
      if (f.endsWith('.token')) {
        const tok = JSON.parse(readFileSync(join(TOKENS_DIR, f), 'utf8'));
        console.log(`${f.replace(/\.token$/, '')}  ${tok.scope?.operation}  ${(tok.scope?.paths ?? []).join(',')}  expires ${tok.expires_at}`);
      }
    }
  } else {
    console.log('no tokens issued yet');
  }
  process.exit(0);
}

if (!args.proposal || args.paths.length === 0 || !args.operation) {
  console.error('usage: node scripts/approve.mjs --proposal <id> --paths a,b --operation <soft-delete|hard-delete|merge>');
  process.exit(1);
}

// List the pending proposals to confirm the human is approving a real one.
const proposalsDir = join(ROOT, 'docs', 'deletion-proposals');
if (existsSync(proposalsDir) && readdirSync(proposalsDir).some((f) => f.includes(args.proposal))) {
  console.log(`  ✓ proposal ${args.proposal} found in docs/deletion-proposals/`);
}

const { issueToken } = await import('./lib/token.mjs');
const token = await issueToken({
  proposalId: args.proposal,
  paths: args.paths,
  operation: args.operation,
  issuer: args.issuer,
});

mkdirSync(TOKENS_DIR, { recursive: true });
const outPath = join(TOKENS_DIR, `${args.proposal}.token`);
writeFileSync(outPath, JSON.stringify(token, null, 2), { mode: 0o600 });
console.log(`\n✅ Approval token issued: ${outPath}`);
console.log(`  proposal: ${args.proposal}`);
console.log(`  operation: ${args.operation}`);
console.log(`  paths: ${args.paths.join(', ')}`);
console.log(`  expires: ${token.expires_at}`);
console.log(`  ed25519: ${token.signature_ed25519.slice(0, 16)}…${token.signature_mldsa65 ? ` mldsa65: ${token.signature_mldsa65.slice(0, 16)}…` : ' (PQC unreachable)'}`);