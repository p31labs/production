#!/usr/bin/env node
/**
 * Bootstrap Check — one command to see which free-funding paths work RIGHT NOW.
 * Probes every zero-cost bootstrap endpoint + P31's Bazaar readiness, and prints
 * a live status table. Run: node scripts/bootstrap-check.mjs
 */
const P31 = 'https://p31-capital-machine-mcp.trimtab-signal.workers.dev';

async function probe(label, url, init = {}, extract = (r, t) => t.slice(0, 120)) {
  try {
    const res = await fetch(url, init);
    const text = await res.text();
    return { label, ok: res.ok, http: res.status, detail: extract(res, text) };
  } catch (e) {
    return { label, ok: false, http: 0, detail: String(e.message ?? e).slice(0, 120) };
  }
}

const results = [];

results.push(await probe('P31 paid resource (402 + bazaar)', `${P31}/resources/revenue.getSummary`, { headers: { Accept: 'application/json' } }, (_r, t) => {
  try { const d = JSON.parse(t); return `bazaar=${'bazaar' in (d.extensions ?? {})} accepts=${d.accepts?.length} descLen=${(d.accepts?.[0]?.description ?? '').length}`; } catch { return 'non-json'; }
}));

results.push(await probe('CDP Bazaar validate probe', 'https://api.cdp.coinbase.com/platform/v2/x402/validate', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ resource: `${P31}/resources/revenue.getSummary` }),
}, (_r, t) => {
  try { const d = JSON.parse(t); const p = d.preflight ?? []; return `pass=${p.filter((x) => x.passed).length}/${p.length}`; } catch { return 'non-json'; }
}));

results.push(await probe('x711.io root (free tier)', 'https://x711.io', {}, () => 'free tier: 10 calls/day/IP'));

results.push(await probe('x711.io onboard spec', 'https://x711.io/api/onboard', {}, (_r, t) => {
  try {
    const d = JSON.parse(t);
    return `spec: ${d.endpoint} · free tier ${d.after_onboard?.free_tier_tools?.length ?? 0} tools · welcome $${d.after_onboard?.welcome_credits_usdc ?? 0}`;
  } catch { return 'non-json'; }
}));

// Purple Flea — real diagnosis (not just "down")
const pfDirect = await probe('Purple Flea faucet (direct)', 'https://faucet.purpleflea.com/v1/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
const pfCasino = await probe('Purple Flea casino register', 'https://casino.purpleflea.com/api/v1/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
results.push({
  label: 'Purple Flea (direct + casino)',
  ok: pfDirect.ok || pfCasino.ok,
  http: pfDirect.http,
  detail: pfDirect.http === 0 && pfCasino.http === 0 ? 'service down — all domains unreachable' : `faucet=${pfDirect.http} casino=${pfCasino.http}`,
});

results.push(await probe('enclave402 dry-run (free sample)', 'https://enclave402.com/api/market/signal?limit=1', { headers: { 'X-Agent-Dry-Run': 'true' } }, (_r, t) => t.includes('402') || t.includes('signal') ? 'dry-run reachable' : 'no signal'));

results.push(await probe('P31 revenue ledger integrity', 'https://p31-monetization.trimtab-signal.workers.dev/api/revenue/verify-chain'));

results.push(await probe('Bazaar discovery (public list)', 'https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources', {}, (_r, t) => {
  try { const d = JSON.parse(t); return `resources=${Array.isArray(d.items) ? d.items.length : 'n/a'}`; } catch { return 'non-json'; }
}));

console.log('\nP31 Bootstrap Status\n====================');
for (const r of results) {
  const mark = r.ok ? '✅' : r.http === 0 ? '⚠️' : r.ok ? '✅' : '❌';
  console.log(`${mark} ${r.label.padEnd(46)} HTTP ${r.http}  ${r.detail}`);
}
console.log('\nActions:')
console.log('  1. Any funded payer balance → node scripts/first-settle.mjs')
console.log('  2. Grants → node scripts/grants.mjs (deadline checklist)');
console.log('  3. Docs → docs/BOOTSTRAP-FUNDS.md (ranked zero-cost paths)');