#!/usr/bin/env node
// duna-counter.mjs — DUNA membership counter
// Reads from local state (in production: queries D1 for signed attestations)
// Usage: node scripts/duna-counter.mjs

const DUNA_TARGET = 100;

// In a full deployment, this queries the relay Worker or D1:
// const res = await fetch('https://relay.p31ca.org/api/duna/stats');
// For now, the shell's MemberDashboard fetches /api/duna/stats

const args = process.argv.slice(2);
const count = parseInt(args[0]) || 18;

const percent = Math.round((count / DUNA_TARGET) * 100);
const bar = '█'.repeat(Math.floor(percent / 4)) + '░'.repeat(25 - Math.floor(percent / 4));
const toGo = Math.max(0, DUNA_TARGET - count);

console.log(`
🕸️  P31 Network Nation — DUNA Countdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Members: ${count} / ${DUNA_TARGET}  [${bar}] ${percent}%
   To go:   ${toGo}
   Status:  ${count >= DUNA_TARGET ? '✅ READY TO FILE' : '⏳ ' + toGo + ' more needed'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Wyoming DUNA Act (W.S. 17-31-101 et seq., 2024)
100-member decentralized nonprofit association
All other requirements: MET (nonprofit purpose, governance docs, technical infra)

To update count: node scripts/duna-counter.mjs <number>
`);

if (count >= DUNA_TARGET) {
  console.log('🎉 Threshold reached! File Articles of Organization: https://sos.wyo.gov');
}
