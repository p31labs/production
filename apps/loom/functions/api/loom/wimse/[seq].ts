import { toWimseAuditRecord } from '@p31ca/canon/loom/wimse-audit-record';
import { toInTotoStatement, signDsse } from '@p31ca/canon/loom/wimse-dsse';
import { generateSigningKeyPair } from '@p31ca/sovereign-primitives/post-quantum';
import type { LoomPagesEnv, LoomRecord } from '../_lib/log';
import { readRecords } from '../_lib/log';

/**
 * GET /api/loom/wimse/:seq — the WIMSE agent-audit record for one event,
 * wrapped in a signed DSSE envelope (in-toto predicate).
 *
 * This is the enterprise export: an independent auditor can verify the
 * envelope against the published Loom audit public key without trusting P31's
 * word. The record carries the authorization decision (from the gate / refusal
 * sidecar) and the observed effect (the committed event), with a derived
 * three-valued agreement — per draft-gilda-wimse-agent-audit-record-00.
 *
 * ⚠️ SIGNING KEY (prototype): a fresh keypair is generated per-request when no
 * LOOM_AUDIT_PRIVATE_KEY is configured. For production, set the secret to a
 * persisted PQC keypair (Ed25519 + ML-DSA-65) and publish the public key.
 * Per-request keys do NOT make the record verifiable across requests — this is
 * the documented prototype path until the persisted key lands.
 */
export const onRequestGet: PagesFunction<LoomPagesEnv, 'seq'> = async (context) => {
  const target = Number(context.params.seq);
  if (!Number.isInteger(target) || target < 0) {
    return Response.json({ error: 'seq must be a non-negative integer' }, { status: 400 });
  }

  const records = await readRecords(context.env);
  const record: LoomRecord | undefined = records.find((r) => r.seq === target);
  if (!record) {
    return Response.json({ error: `no event at seq ${target}` }, { status: 404 });
  }

  // Decision: if a refusal sidecar row exists for this seq, the gate refused
  // (or observed a would-refuse). Otherwise the event committed → allow.
  const refusal = records.find(
    (r) => r.seq === target && (r as LoomRecord & { mode?: string }).mode === 'enforce',
  );
  const decision = refusal
    ? { decision: 'refuse' as const, policy: 'gate', reason: (refusal as { reason?: string }).reason ?? 'refused by gate' }
    : { decision: 'allow' as const, policy: 'gate', reason: 'committed event' };

  const wimse = toWimseAuditRecord({
    record,
    decision,
    agentId: 'did:key:z6Mk-lumi',
    principal: 'willyj1587@gmail.com',
    effectObserved: decision.decision === 'allow',
  });

  // SHA-256 of the canonical event payload — the digest the chain commits to.
  const sha = await sha256Hex(record.data);

  // Signing: prototype path generates a per-request key. Production should
  // load a persisted PQC keypair from a secret and publish the public half.
  const keyPair = await generateSigningKeyPair();
  const keyid = 'did:key:loom-audit-prototype';
  const statement = toInTotoStatement(wimse, `loom:seq:${target}`, sha);
  const envelope = await signDsse(statement, keyPair, keyid);

  return Response.json(
    { envelope, publicKey: { classical: b64(keyPair.classical.publicKey), pqc: b64(keyPair.pqc.publicKey) } },
    { headers: { 'Cache-Control': 'no-store' } },
  );
};

function b64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}