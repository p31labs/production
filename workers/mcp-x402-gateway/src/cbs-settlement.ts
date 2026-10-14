// cbs-settlement.ts — LOVE settlement client for the x402 gateway.
//
// Implements the CLIENT half of the two-challenge Clause Blind Schnorr
// settlement (docs/specs/love-settlement-cbs.md §5): fetch the ledger's
// issuer parameters, build the canonical settlement message, derive the
// blinding factors from a per-call b-seed (Taler-style domain-separated
// SHA-512), blind, ask the ledger to sign both blinded challenges, unblind,
// self-verify, and return the header payloads. Every failure throws —
// the caller converts that to a 502 (fail closed).

import { ensureCbs, blind, unblind, verify } from './taler-cbs/loader';

function b64e(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function b64d(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// α_i = SHA-512("cbs-a{i}" ‖ bseed)[0..32], β_i = SHA-512("cbs-b{i}" ‖ bseed)[0..32].
// (Scalars are reduced mod L inside the WASM.)
async function factor(domain: string, seed: Uint8Array): Promise<Uint8Array> {
  const dom = new TextEncoder().encode(domain);
  const input = new Uint8Array(dom.length + seed.length);
  input.set(dom, 0);
  input.set(seed, dom.length);
  const h = new Uint8Array(await crypto.subtle.digest('SHA-512', input));
  return h.slice(0, 32);
}

export interface SettlementIssuance {
  // X-LOVE-Signature header value: b64 JSON {r0,r1,s0,s1,c0,c1,t}
  signatureB64: string;
  // X-LOVE-Settlement header value: b64(m)
  settlementB64: string;
}

/**
 * Run the client half of the CBS settlement against the deployed ledger.
 * @param ledgerUrl  e.g. https://love-ledger.p31ca.org
 * @param settlement { did, tool, amount } — amount is the decimal price string.
 */
export async function issueLoveSettlement(
  ledgerUrl: string,
  settlement: { did: string; tool: string; amount: string },
): Promise<SettlementIssuance> {
  if (!ledgerUrl) throw new Error('LOVE_LEDGER_URL not configured');

  // 1. Issuer parameters: {X, R0, R1, t}.
  const pkRes = await fetch(`${ledgerUrl}/blind-pubkey`);
  if (!pkRes.ok) throw new Error(`blind-pubkey ${pkRes.status}`);
  const pk = (await pkRes.json()) as { X?: string; R0?: string; R1?: string; t?: string };
  if (!pk.X || !pk.R0 || !pk.R1 || !pk.t) throw new Error('blind-pubkey malformed');

  // 2. Canonical settlement message (spec §3 — key order matters).
  const m = JSON.stringify({
    version: '1',
    did: settlement.did,
    tool: settlement.tool,
    amount: settlement.amount,
    t: pk.t,
  });
  const mBytes = new TextEncoder().encode(m);

  await ensureCbs();
  const bseed = crypto.getRandomValues(new Uint8Array(32));
  const [a0, a1, b0, b1] = await Promise.all([
    factor('cbs-a0', bseed),
    factor('cbs-a1', bseed),
    factor('cbs-b0', bseed),
    factor('cbs-b1', bseed),
  ]);

  // 3. Blind both challenges.
  const bl = blind(mBytes, a0, a1, b0, b1, b64d(pk.R0), b64d(pk.R1), b64d(pk.X));

  // 4. Ledger signs both blinded challenges (single-use t claimed there).
  const signRes = await fetch(`${ledgerUrl}/blind-sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ c0: b64e(bl.c0), c1: b64e(bl.c1), t: pk.t }),
  });
  if (!signRes.ok) throw new Error(`blind-sign ${signRes.status}`);
  const signed = (await signRes.json()) as { s0?: string; s1?: string };
  if (!signed.s0 || !signed.s1) throw new Error('blind-sign malformed');

  // 5. Unblind both partials.
  const { sp0, sp1 } = unblind(b64d(signed.s0), b64d(signed.s1), a0, a1);

  // 6. Defensive self-verify of BOTH challenges before forwarding.
  if (!verify(mBytes, bl.cp0, sp0, bl.cp1, sp1, b64d(pk.X), bl.rp0, bl.rp1)) {
    throw new Error('self-verify failed');
  }

  // 7. Header payloads: r_i/s_i/c_i are the UNBLINDED R'_i/s'_i/c'_i.
  const sig = {
    r0: b64e(bl.rp0), r1: b64e(bl.rp1),
    s0: b64e(sp0), s1: b64e(sp1),
    c0: b64e(bl.cp0), c1: b64e(bl.cp1),
    t: pk.t,
  };
  return {
    signatureB64: btoa(JSON.stringify(sig)),
    settlementB64: btoa(m),
  };
}