#!/usr/bin/env node
/**
 * Grants pipeline — deadline checklist for every application P31 has drafted or
 * can submit. Prints status + days remaining, computed from today.
 * Run: node scripts/grants.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const docs = join(here, '..', 'docs');

const today = new Date();
const DAY = 86400000;
const daysUntil = (iso) => Math.max(0, Math.ceil((new Date(iso).getTime() - today.getTime()) / DAY));

const grants = [
  { name: 'NLnet (open call)', amount: '€5K–€50K', deadline: '2026-11-03', doc: 'NLNET-PROPOSAL.md', submit: 'https://nlnet.nl/propose' },
  { name: 'Interledger Local Impact', amount: '$500–$3K', deadline: '2026-11-11', doc: 'INTERLEDGER-PROPOSAL.md', submit: 'https://interledger.org/grant/local-impact (Submittable)' },
  { name: 'Digital Science Catalyst', amount: 'up to £25K', deadline: '2026-10-05', doc: 'DIGITAL-SCIENCE-GRANT.md', submit: 'catalyst.digital-science.com' },
  { name: 'NSF PESOSE (Agent Protocols)', amount: 'up to $300K', deadline: 'FY26', doc: 'NSF-PESOSE.md', submit: 'nsf.gov PESOSE solicitation' },
  { name: 'Base Builder Grant', amount: 'up to $5K', deadline: 'rolling', doc: 'BASE-BUILDER-GRANT.md', submit: 'Base Builder program' },
  { name: 'x402 micro-grants (PROJECT-IDEAS)', amount: 'up to $3K', deadline: 'rolling', doc: null, submit: '2-min video → tag @coinbaseDev / @murrlincoln' },
  { name: 'EXANTE Gecko Fund', amount: '€10K–€150K', deadline: 'quarterly', doc: 'EXANTE-GECKO.md', submit: 'https://geckofund.org' },
  { name: 'COTI Web4 (agents)', amount: '$COTI/epoch', deadline: 'no application', doc: null, submit: 'connect MCP server, earn on usage' },
  { name: 'Artizen Neurodivergent Builders', amount: '$500–$5K', deadline: 'rolling', doc: null, submit: 'project page + video (deferred — higher overhead)' },
  { name: 'IoTeX Halo (DePIN PoC)', amount: 'up to $2K', deadline: 'rolling', doc: 'IOTEX-HALO.md', submit: 'iotex.io/halo' },
  { name: 'OORT Foundation', amount: '$5K–$100K', deadline: 'rolling', doc: 'OORT-FOUNDATION.md', submit: 'oortfoundation.org' },
  { name: 'Tether Dev Grants', amount: '$1.5K–$4K', deadline: 'rolling', doc: 'TETHER-DEV-GRANTS.md', submit: 'tether.dev/grants' },
];

console.log('\nP31 Grant Pipeline (as of ' + today.toISOString().slice(0, 10) + ')');
console.log('='.repeat(88));
for (const g of grants) {
  const docReady = g.doc ? (existsSync(join(docs, g.doc)) ? '✅ drafted' : '❌ not drafted') : '—';
  const isFixed = !['rolling', 'quarterly', 'no application'].includes(g.deadline) && !isNaN(new Date(g.deadline).getTime());
  const days = isFixed ? `${daysUntil(g.deadline)}d left` : g.deadline;
  console.log(`${g.name.padEnd(32)} ${g.amount.padEnd(12)} ${String(days).padEnd(14)} ${docReady.padEnd(12)} ${g.submit}`);
}
console.log('='.repeat(88));
console.log('\nAlso: enclave402 bounty ($0.25 USDC) — needs one paid call (~$0.003–0.01), then funds the settle.');
console.log('Zero-fund bootstraps → docs/BOOTSTRAP-FUNDS.md · live status → node scripts/bootstrap-check.mjs');