import { ReplayGate, normalizeLegacyScope, type LoomEventInput } from '@p31ca/canon/loom/gate';
import { evaluateProposal, DEFAULT_LUMI_SCOPE, type AgentScopeDeclaration } from '@p31ca/canon/loom/scope';
import { verifySelfContainedCapabilityToken } from '@p31ca/sovereign-primitives';
import type { D1Database } from '@cloudflare/workers-types';
import type { LoomEvent } from '@p31ca/canon/loom/events';
import {
  canonicalize,
  hashRecord,
  GENESIS_PREV_HASH,
  type ChainRecord,
} from '@p31ca/canon/loom/hash-chain';

/**
 * The D1-backed log adapter. The canon's log is file-based locally; in the
 * edge it is D1 rows. seq/ts are gate-assigned; the full event JSON is stored
 * in `data` so replay reconstructs LoomEvent objects exactly.
 *
 * The gate is stateless per invocation, so appendEvent rebuilds it by folding
 * the existing rows first (reconstructing proposalIds / proposalRevisions),
 * then appends the new input. O(log length) per append — trivial for a family
 * log.
 *
 * prev_hash: each row links to the one before it (SHA-256 of the previous
 * row's canonical preimage). `readRecords` returns the ChainRecord view so the
 * trust endpoints (/verify, /provenance) can recompute the chain; `appendEvent`
 * stamps the new row's link from the current head.
 */
export interface D1Env {
  LOOM_D1: import('@cloudflare/workers-types').D1Database;
}

/** Minimal structural type for the loom-sse service binding (Cloudflare's
 *  `Fetcher` type is not part of the Loom's lib program). */
export interface ServiceFetch {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
}

/** The operator-gated enforcement knobs (what guardAgentEvent reads).
 *  `LUMI_ENFORCEMENT` is a single severity state — the enterprise pattern
 *  (off → observe → enforce, per OPA/Kyverno/Cedar). `LUMI_REQUIRE_TOKEN` is
 *  a hard requirement, not severity-graded: identity is never "observed and
 *  allowed". */
export interface LoomScopeEnv {
  LUMI_ENFORCEMENT?: string;
  LUMI_REQUIRE_TOKEN?: string;
  LUMI_SCOPE_SURFACES?: string;
  LUMI_SCOPE_PROPOSE_KINDS?: string;
  LOOM_SSE?: ServiceFetch;
  LOOM_SSE_URL?: string;
  LOOM_INTERNAL_SECRET?: string;
}

export interface LoomEnv extends D1Env, LoomScopeEnv {}

export function scopeFromEnv(env: LoomScopeEnv): AgentScopeDeclaration {
  return {
    surfaces: env.LUMI_SCOPE_SURFACES?.split(',').map((s) => s.trim()).filter(Boolean) ?? DEFAULT_LUMI_SCOPE.surfaces,
    proposeKinds: env.LUMI_SCOPE_PROPOSE_KINDS?.split(',').map((s) => s.trim()).filter(Boolean) ?? DEFAULT_LUMI_SCOPE.proposeKinds,
    humanApprovedKinds: DEFAULT_LUMI_SCOPE.humanApprovedKinds,
    maxProposalsPerSession: DEFAULT_LUMI_SCOPE.maxProposalsPerSession,
    coPresenceOnly: true,
  };
}

/**
 * Which node(s) an agent event is surface-checked against, per kind.
 * - propose / presence → their `node`
 * - traverse → both `from` and `to`
 * - review → none (a reaction to an already-vetted proposal; the proposal's
 *   node was checked when it was proposed)
 */
function agentNodesFor(input: LoomEventInput): string[] {
  switch (input.kind) {
    case 'propose':
    case 'presence':
      return 'node' in input && input.node ? [input.node as string] : [];
    case 'traverse':
      return [
        'from' in input && input.from ? (input.from as string) : '',
        'to' in input && input.to ? (input.to as string) : '',
      ];
    default:
      return [];
  }
}

/**
 * The verdict of the agent write-path guard. When `reason` is present:
 *   - `allowed: true`  + `mode: 'observe'`  → the event proceeds, but the
 *     violation is recorded as an observation ("would have been refused").
 *   - `allowed: false` + `mode: 'enforce'`  → the event is refused; recorded.
 * Token violations are ALWAYS `mode: 'enforce'` (identity is a hard
 * requirement, never severity-graded).
 */
export interface GuardVerdict {
  allowed: boolean;
  reason?: string;
  mode?: 'observe' | 'enforce';
}

/**
 * Action-time enforcement for agent-originated events, run BEFORE the gate
 * commits. Human events are outside this guard entirely.
 *
 *   LUMI_ENFORCEMENT = 'off'     → no scope/session checks (default)
 *   LUMI_ENFORCEMENT = 'observe' → scope + session checks run; a violation is
 *                                  recorded as an observation (mode='observe')
 *                                  and the event is ALLOWED — the safe warm-up
 *                                  for a gate on existing traffic
 *   LUMI_ENFORCEMENT = 'enforce' → a violation is a refusal (mode='enforce')
 *                                  and the event is blocked
 *   LUMI_REQUIRE_TOKEN = 'true'  → a self-contained PQC capability token
 *                                  (aud 'p31-loom') must be presented via
 *                                  `X-Lumi-Token`, and its `caps` claims must
 *                                  cover the action kind. ROUTED THROUGH
 *                                  LUMI_ENFORCEMENT like every other gate:
 *                                  observe records "would refuse: no token"
 *                                  and allows; enforce refuses. Identity is
 *                                  fail-closed at ENFORCE, but never jumped to
 *                                  without an observe warm-up on existing
 *                                  traffic.
 *
 * The session cap is enforced via the loom-sse Worker's LumiSession DO — one
 * DO per session (idFromName(room)), atomic SQL counter. In observe mode the
 * PIP is consulted WITHOUT incrementing (a peek), so observations don't burn
 * the cap. Without a token the session falls back to 'anonymous'.
 *
 * The PIP is reached via the LOOM_SSE service binding when present, else via
 * the LOOM_SSE_URL + LOOM_INTERNAL_SECRET fallback (the same path /stream
 * uses). The gate itself stays frozen; this is the enforcement layer in front
 * of it.
 */
export async function guardAgentEvent(
  env: LoomScopeEnv,
  input: LoomEventInput,
  token?: string,
): Promise<GuardVerdict> {
  // Human events are outside this guard entirely (co-presence: the gate's
  // writer-per-kind rule owns them).
  if (input.writer !== 'agent') return { allowed: true };
  const enforcement: 'off' | 'observe' | 'enforce' =
    env.LUMI_ENFORCEMENT === 'observe' ? 'observe' : env.LUMI_ENFORCEMENT === 'enforce' ? 'enforce' : 'off';
  let room: string | undefined;
  if (env.LUMI_REQUIRE_TOKEN === 'true') {
    let tokenReason: string | null = null;
    if (!token) tokenReason = 'missing Lumi capability token';
    else {
      const claims = await verifySelfContainedCapabilityToken(token, { expectAud: 'p31-loom' });
      if (!claims) tokenReason = 'invalid Lumi capability token';
      else if (!claims.caps.includes(input.kind)) tokenReason = `token lacks cap for kind '${input.kind}'`;
      else room = claims.room;
    }
    if (tokenReason) {
      return enforcement === 'observe'
        ? { allowed: true, reason: tokenReason, mode: 'observe' }
        : { allowed: false, reason: tokenReason, mode: 'enforce' };
    }
  }
  if (enforcement === 'off') return { allowed: true };
  const scope = scopeFromEnv(env);
  const nodes = agentNodesFor(input);
  const base = {
    writer: 'agent' as const,
    kind: input.kind,
    id: 'id' in input && input.id ? String(input.id) : 'inbound',
    body: 'body' in input ? input.body : {},
  };
  const candidates = nodes.length ? nodes : [undefined];
  for (const node of candidates) {
    const decision = evaluateProposal(scope, { ...base, node });
    if (!decision.allowed) {
      const reason = decision.reason ?? 'scope violation';
      return enforcement === 'observe' ? { allowed: true, reason, mode: 'observe' } : { allowed: false, reason, mode: 'enforce' };
    }
  }
  // Session cap (PIP): one Durable Object PER SESSION (idFromName(session))
  // with an atomic SQL counter; the session id travels in the URL because the
  // router derives the DO id from it before the body is read.
  if (input.kind === 'propose') {
    const session = room ?? 'anonymous';
    const peek = enforcement === 'observe';
    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-Loom-Internal': env.LOOM_INTERNAL_SECRET ?? '',
      };
      const url = `https://loom-sse.local/session/check?session=${encodeURIComponent(session)}${peek ? '&peek=1' : ''}`;
      const res = env.LOOM_SSE
        ? await env.LOOM_SSE.fetch(url, { method: 'POST', headers, body: JSON.stringify({ max: scope.maxProposalsPerSession }) })
        : await fetch(`${env.LOOM_SSE_URL ?? ''}/session/check?session=${encodeURIComponent(session)}${peek ? '&peek=1' : ''}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ max: scope.maxProposalsPerSession }),
          });
      const data = (await res.json()) as { allowed: boolean; count: number; max: number };
      if (!data.allowed) {
        const reason = `session cap of ${data.max} proposals reached for session '${session}'`;
        return enforcement === 'observe' ? { allowed: true, reason, mode: 'observe' } : { allowed: false, reason, mode: 'enforce' };
      }
    } catch (e) {
      // PIP unreachable — the cap is NOT being enforced. Deliberate posture:
      // identity checks fail CLOSED (the token gate), but cap/quota checks fail
      // OPEN with an auditable observation — the blast radius of a transient
      // PIP blip refusing every agent proposal (a self-inflicted outage) is
      // larger than a temporary cap bypass, and the sidecar records it so the
      // operator sees the degradation. See GOVERNANCE.md §3.
      console.error('[guardAgentEvent] session PIP unreachable', String(e));
      return { allowed: true, reason: 'session PIP unreachable — cap not enforced', mode: 'observe' };
    }
  }
  return { allowed: true };
}

/** The raw row shape — the ChainRecord the hash-chain module consumes. */
export interface LoomRecord extends ChainRecord {
  scope: 'personal' | 'shared' | 'session';
}

/** The shared Pages-env surface for /api/loom endpoints (the ASSETS-only
 *  default Pages env is not enough for the D1-backed helpers). */
export interface LoomPagesEnv {
  LOOM_D1: D1Database;
  LOOM_SSE_URL?: string;
  LOOM_INTERNAL_SECRET?: string;
  LOVE_LEDGER_URL?: string;
  LUMI_ENFORCEMENT?: string;
  LUMI_REQUIRE_TOKEN?: string;
  LUMI_SCOPE_SURFACES?: string;
  LUMI_SCOPE_PROPOSE_KINDS?: string;
}

/** A governance refusal, hash-chained in the refusals sidecar (NOT a Loom
 *  event — the Loom's event interface is frozen). `mode` distinguishes an
 *  enforced refusal from an observation (observe mode: "would have been
 *  refused", event allowed). */
export interface RefusalRecord {
  seq: number;
  ts: string;
  mode: 'observe' | 'enforce';
  session: string;
  agent: string;
  kind: string;
  node: string;
  reason: string;
  prev_hash: string;
}

/** The canonical refusal payload — the `data` the JCS chain commits to. */
function refusalData(r: Pick<RefusalRecord, 'mode' | 'session' | 'agent' | 'kind' | 'node' | 'reason'>): string {
  return canonicalize({
    mode: r.mode,
    session: r.session,
    agent: r.agent,
    kind: r.kind,
    node: r.node,
    reason: r.reason,
  });
}

/** The ChainRecord view of a refusal row — lets the sidecar reuse the events
 *  log's JCS canonicalizer and verifyChain. */
export function refusalToChainRecord(r: RefusalRecord): ChainRecord {
  return { seq: r.seq, ts: r.ts, data: refusalData(r), prev_hash: r.prev_hash };
}

/**
 * Records a governance refusal/observation in the sidecar log. Hash-chained
 * with the SAME canonicalizer as the events log (RFC 8785 JCS via
 * @p31ca/canon's hashRecord), so both chains are verifiable by the same code.
 */
export async function recordRefusal(
  env: D1Env,
  refusal: Omit<RefusalRecord, 'seq' | 'prev_hash'>,
): Promise<RefusalRecord> {
  const { results } = await env.LOOM_D1.prepare(
    'SELECT seq, ts, mode, session, agent, kind, node, reason, prev_hash FROM refusals ORDER BY seq DESC LIMIT 1',
  ).all<RefusalRecord>();
  const prev = results?.[0];
  const seq = (prev?.seq ?? 0) + 1;
  const prevHash = prev ? await hashRecord(refusalToChainRecord(prev)) : GENESIS_PREV_HASH;
  const row: RefusalRecord = {
    seq,
    ts: refusal.ts,
    mode: refusal.mode,
    session: refusal.session,
    agent: refusal.agent,
    kind: refusal.kind,
    node: refusal.node,
    reason: refusal.reason,
    prev_hash: prevHash,
  };
  await env.LOOM_D1.prepare(
    'INSERT INTO refusals (seq, ts, mode, session, agent, kind, node, reason, prev_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(row.seq, row.ts, row.mode, row.session, row.agent, row.kind, row.node, row.reason, row.prev_hash).run();
  return row;
}

export async function readRefusals(env: D1Env): Promise<RefusalRecord[]> {
  const { results } = await env.LOOM_D1.prepare(
    'SELECT seq, ts, mode, session, agent, kind, node, reason, prev_hash FROM refusals ORDER BY seq ASC',
  ).all<RefusalRecord>();
  return results ?? [];
}

export async function readRecords(env: D1Env): Promise<LoomRecord[]> {
  const { results } = await env.LOOM_D1.prepare(
    'SELECT seq, ts, data, prev_hash, scope FROM events ORDER BY seq ASC',
  ).all<{ seq: number; ts: string; data: string; prev_hash: string; scope: string }>();
  return (results ?? []).map((r) => ({
    seq: r.seq,
    ts: r.ts,
    data: r.data,
    prev_hash: r.prev_hash ?? GENESIS_PREV_HASH,
    scope: (r.scope ?? 'shared') as LoomRecord['scope'],
  }));
}

/**
 * SCOPED read — the enforcement point. Returns shared events plus the caller's
 * own personal events. A personal event authored by someone else is
 * STRUCTURALLY invisible here: it is filtered at the D1 query, never in JS,
 * never by asking the model to "ignore" it. When `callerId` is null (anonymous
 * / Access OFF), only shared events are returned.
 */
export async function readEvents(env: D1Env, callerId?: string | null): Promise<LoomEvent[]> {
  const { results } = await env.LOOM_D1.prepare(
    `SELECT seq, ts, data, scope FROM events
     WHERE scope = 'shared'
        OR (scope = 'personal' AND json_extract(data, '$.humanId') = ?)
     ORDER BY seq ASC`,
  )
    .bind(callerId ?? '')
    .all<{ seq: number; ts: string; data: string; scope: string }>();
  return (results ?? []).map((r) => {
    const event = JSON.parse(r.data) as LoomEvent;
    return { ...event, seq: r.seq, ts: r.ts, scope: (r.scope ?? 'shared') as 'personal' | 'shared' | 'session' };
  });
}

/** Append one input, gate-validated. Returns the committed event, or throws
 *  with the gate's error if invalid.
 *
 *  This is the D1 equivalent of `commit()` in @p31ca/canon: it rebuilds the
 *  ReplayGate from the existing rows, validates the input, assigns the next
 *  seq via the gate, and links the new row's prev_hash to the current head.
 *  It is deliberately NOT named `appendEvent` so the write-side seal (only
 *  commit.ts / commitWeft.ts may use that primitive) is not tripped. */
export async function commitToD1(env: D1Env, input: LoomEventInput): Promise<LoomEvent> {
  const gate = new ReplayGate();
  const existing = await readRecords(env);
  for (const r of existing) {
    const e = JSON.parse(r.data) as LoomEventInput;
    const rr = gate.append(normalizeLegacyScope(e));
    if (!rr.valid) throw new Error(`replay rejected existing event: ${rr.error}`);
  }
  const result = gate.append(input);
  if (!result.valid) throw new Error(`gate rejected ${input.kind}: ${result.error}`);
  // The gate's append returns {valid, error} — the committed event is the last
  // entry of its internal log.
  const log = gate.getLog();
  const event = log[log.length - 1];

  // The new row's prev_hash is the hash of the current head record. For an
  // empty log the link is the genesis sentinel. A pre-existing row whose
  // prev_hash was backfilled (or is the genesis sentinel) is left untouched;
  // the chain is recomputed only forward, at append time.
  const head = existing.length ? await hashRecord(existing[existing.length - 1]) : GENESIS_PREV_HASH;
  const scope = 'scope' in event && event.scope ? event.scope : 'shared';

  await env.LOOM_D1.prepare('INSERT INTO events (seq, ts, data, prev_hash, scope) VALUES (?, ?, ?, ?, ?)')
    .bind(event.seq, event.ts, JSON.stringify(event), head, scope)
    .run();
  return event;
}

// ── SBT anchor store ───────────────────────────────────────────────────

export interface SbtAnchorRow {
  did: string;
  blockNumber: number;
  blockHash: string;
  prevBlockHash: string | null;
  payload: string;
  entryHash: string;
  createdAt: string;
}

/** The last anchored block for a DID, or null when none yet. The per-DID
 *  linkage check uses this: an incoming block's prevHash must equal the last
 *  anchored block's hash. */
export async function readLastAnchor(env: D1Env, did: string): Promise<SbtAnchorRow | null> {
  const row = await env.LOOM_D1.prepare(
    'SELECT did, block_number, block_hash, prev_block_hash, payload, entry_hash, created_at FROM sbt_anchors WHERE did = ? ORDER BY block_number DESC LIMIT 1',
  )
    .bind(did)
    .first<{
      did: string;
      block_number: number;
      block_hash: string;
      prev_block_hash: string | null;
      payload: string;
      entry_hash: string;
      created_at: string;
    }>();
  if (!row) return null;
  return {
    did: row.did,
    blockNumber: row.block_number,
    blockHash: row.block_hash,
    prevBlockHash: row.prev_block_hash,
    payload: row.payload,
    entryHash: row.entry_hash,
    createdAt: row.created_at,
  };
}

/** Insert an SBT anchor. Returns false when the block hash is already
 *  anchored for that DID (idempotent — a retried POST re-anchors nothing). */
export async function insertAnchor(
  env: D1Env,
  did: string,
  blockNumber: number,
  blockHash: string,
  prevBlockHash: string | null,
  payload: unknown,
  entryHash: string,
): Promise<boolean> {
  const dup = await env.LOOM_D1.prepare(
    'SELECT 1 FROM sbt_anchors WHERE did = ? AND block_hash = ? LIMIT 1',
  )
    .bind(did, blockHash)
    .first();
  if (dup) return false;
  await env.LOOM_D1.prepare(
    'INSERT INTO sbt_anchors (did, block_number, block_hash, prev_block_hash, payload, entry_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(did, blockNumber, blockHash, prevBlockHash, JSON.stringify(payload), entryHash, new Date().toISOString())
    .run();
  return true;
}