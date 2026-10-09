/**
 * @p31ca/canon — loom/gate.ts
 *
 * The Loom's integrity gate. Sits between the append API and the log:
 *
 *   - assigns `seq` and `ts` (the caller never does)
 *   - enforces writer-per-kind (focus/revise/approve/reject = human;
 *     traverse/propose/review/presence = agent)
 *   - rejects duplicate proposal ids and orphan approvals/revises/rejects/reviews
 *   - rejects a review on a stale revision — the gate's job, not the reducer's,
 *     because a review pinning a version the proposal no longer has is a
 *     structural error, not a fold concern
 *   - proves the reducer is deterministic (double replay + canonical compare)
 *   - reconstructs state at any seq for the canvas scrubber
 *
 * It is the contract both parallel paths build against: if an event is in the
 * log, it is guaranteed to replay. The agent appends through this; it never
 * writes registry.json, contracts, or CSS.
 */
import type { AatAttestation, LoomEvent, LoomState } from './events.js';
import { initialState, reduce as defaultReduce } from './events.js';

export type Reducer = (state: LoomState, event: LoomEvent) => LoomState;

/**
 * Normalize a legacy event for replay through the (now scope-strict) gate.
 * Old rows predate the scope field: they are `shared` by default but may carry
 * a humanId. The gate rejects shared-with-humanId (a family record carries the
 * family, not an individual) — so on replay we strip the humanId from events
 * that have no explicit scope. Events that explicitly declare `personal` keep
 * their humanId. The stored `data` (part of the hash chain) is never mutated;
 * only the in-memory replay is normalized.
 */
export function normalizeLegacyScope(input: LoomEventInput | LoomEvent): LoomEventInput {
  const e = input as Record<string, unknown>;
  if (e.scope === 'personal') return input as LoomEventInput;
  // No scope (or an explicit non-personal scope): drop the humanId.
  const { humanId: _humanId, ...rest } = input as LoomEventInput & { humanId?: string };
  return rest as LoomEventInput;
}

/** An event before the gate stamps it with seq + ts. `statedBy` is the
 *  writer's code name (a handle, never a raw id) — how a shared family event
 *  names its author without exposing a humanId. */
export type LoomEventInput =
  | { writer: 'human'; kind: 'focus'; node: string; scope?: 'personal' | 'shared' | 'session'; statedBy?: string; humanId?: string }
  | { writer: 'agent'; kind: 'traverse'; from: string; to: string; reason: string }
  | { writer: 'agent'; kind: 'propose'; id: string; node: string; body: unknown; author?: string; parentAgent?: string }
  | { writer: 'human'; kind: 'revise'; proposal: string; body: unknown; scope?: 'personal' | 'shared' | 'session'; statedBy?: string; humanId?: string }
  | { writer: 'human'; kind: 'approve'; proposal: string; scope?: 'personal' | 'shared' | 'session'; statedBy?: string; humanId?: string }
  | { writer: 'human'; kind: 'reject'; proposal: string; reason: string; scope?: 'personal' | 'shared' | 'session'; statedBy?: string; humanId?: string }
  | { writer: 'agent'; kind: 'review'; agent: string; proposalId: string; decision: 'approve' | 'amend' | 'reject'; reason?: string; revision: number; parentAgent?: string }
  | { writer: 'agent'; kind: 'presence'; node: string; attention: number }
  | { writer: 'human'; kind: 'view.save'; label: string; from: number; to: number; scope?: 'personal' | 'shared' | 'session'; statedBy?: string; humanId?: string }
  | { writer: 'human'; kind: 'instrument.zone.place'; node: string; position: [number, number, number]; timbre: string; name?: string; scope?: 'personal' | 'shared' | 'session'; statedBy?: string; humanId?: string }
  | { writer: 'human'; kind: 'instrument.zone.clear'; node: string; scope?: 'personal' | 'shared' | 'session'; statedBy?: string; humanId?: string }
  | { writer: 'human'; kind: 'instrument.zone.name'; node: string; name: string; scope?: 'personal' | 'shared' | 'session'; statedBy?: string; humanId?: string }
  | { writer: 'human'; kind: 'instrument.zone.move'; node: string; position: [number, number, number]; scope?: 'personal' | 'shared' | 'session'; statedBy?: string; humanId?: string }
  | { writer: 'human'; kind: 'control.mapping.set'; source: string; destination: string; mapping: Record<string, unknown>; scope?: 'personal' | 'shared' | 'session'; statedBy?: string; humanId?: string }
  | { writer: 'human'; kind: 'control.mapping.clear'; source: string; destination: string; scope?: 'personal' | 'shared' | 'session'; statedBy?: string; humanId?: string }
  | { writer: 'human'; kind: 'control.patch.set'; engine: 'polysynth' | 'noisemachine' | 'drumkit'; params: Record<string, number | string>; scope?: 'personal' | 'shared' | 'session'; statedBy?: string; humanId?: string }
  | { writer: 'human'; kind: 'control.midi.learn'; source: string; controlId: string; cc: number; scope?: 'personal' | 'shared' | 'session'; statedBy?: string; humanId?: string }
  // v1.1 additive extension — chat.* conversation kinds (mirrors events.ts).
  // PRIVACY: prompts/reasons are carried as an HMAC or content hash + length,
  // never raw text, in production.
  | { writer: 'human'; kind: 'chat.send'; node: string; prompt: string; agent: string; scope?: 'personal' | 'shared' | 'session'; statedBy?: string; humanId?: string }
  | { writer: 'human'; kind: 'chat.artifact.approve'; node: string; artifactId: string; scope?: 'personal' | 'shared' | 'session'; statedBy?: string; humanId?: string }
  | { writer: 'human'; kind: 'chat.artifact.reject'; node: string; artifactId: string; reason: string; scope?: 'personal' | 'shared' | 'session'; statedBy?: string; humanId?: string }
  | { writer: 'agent'; kind: 'chat.artifact.generated'; node: string; artifactId: string; artifactType: string; screenshotRef?: string; screenshotRef2?: string; description?: string; attestation?: AatAttestation };

/** The writer-per-kind rule set, exported as data — the single source the
 *  gate AND downstream consumers (e.g. loom/training.ts co-presence scoring)
 *  import, so the two can never diverge. */
export const HUMAN_KINDS = new Set(['focus', 'revise', 'approve', 'reject', 'view.save', 'instrument.zone.place', 'instrument.zone.clear', 'instrument.zone.name', 'instrument.zone.move', 'control.mapping.set', 'control.mapping.clear', 'control.patch.set', 'control.midi.learn', 'chat.send', 'chat.artifact.approve', 'chat.artifact.reject']);
export const AGENT_KINDS = new Set(['traverse', 'propose', 'review', 'presence', 'chat.artifact.generated']);

export interface GateResult {
  valid: boolean;
  error?: string;
}

/** Deterministic serialization of LoomState — the hashing surface for parity. */
export function canonicalize(state: LoomState): string {
  const proposals = [...state.proposals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => [k, { ...v }]);
  return JSON.stringify({
    focused: state.focused,
    agentCursor: state.agentCursor,
    agentAttention: state.agentAttention,
    agentPath: state.agentPath,
    proposals,
    saves: state.saves,
  });
}

export class ReplayGate {
  private log: LoomEvent[] = [];
  private proposalIds = new Set<string>();
  /** id -> current revision (0 after propose, +1 per revise). Rebuilt on
   *  rehydrate so a post-reload review is checked against the right revision. */
  private proposalRevisions = new Map<string, number>();
  /** destination -> source, folded from control.mapping.set/clear events.
   *  Enforces the MVP one-to-one routing rule (a destination bound to a
   *  different source is rejected). Rebuilt on rehydrate like proposalRevisions. */
  private routing = new Map<string, string>();
  /** source -> destination, the inverse of `routing` — the MVP one-to-one
   *  rule is both directions (one knob, one mapping, one destination). */
  private routingBySource = new Map<string, string>();
  private seq = 0;

  /** Validate, stamp with seq + ts, append. seq is assigned by the gate. */
  append(input: LoomEventInput): GateResult {
    const expected = HUMAN_KINDS.has(input.kind) ? 'human' : 'agent';
    if (!HUMAN_KINDS.has(input.kind) && !AGENT_KINDS.has(input.kind)) {
      return { valid: false, error: `unknown kind: ${(input as { kind: string }).kind}` };
    }
    if (input.writer !== expected) {
      return { valid: false, error: `kind '${input.kind}' requires writer='${expected}', got '${input.writer}'` };
    }
    // Scope shape check — structural, never authorization. A `personal` event
    // must name its owner (a scope nobody can enforce is a leak); a `shared`
    // event must NOT carry a humanId (a family record carries the family, not
    // an individual — identity is surfaced via code names, never raw ids).
    // Agent events are always `shared`: the agent is co-present by definition,
    // and the writer-per-kind rule already isolates it from human personal
    // state. `session` is reserved — allowed by the type, no writers yet.
    // The scope DEFAULTS to 'shared' when absent — so a new event that carries
    // a humanId without declaring 'personal' is rejected (the App must opt
    // into personal explicitly). Legacy rows are tolerated by the adapters
    // (they strip humanId from shared events on replay / at the read path).
    const scope = 'scope' in input && input.scope ? input.scope : 'shared';
    if (scope === 'personal') {
      const maybe = input as LoomEventInput & { humanId?: string };
      if (!maybe.humanId || maybe.humanId.trim().length === 0) {
        return { valid: false, error: `kind '${input.kind}' is 'personal' but carries no humanId` };
      }
    } else if (scope === 'shared' && (input as LoomEventInput & { humanId?: string }).humanId) {
      return { valid: false, error: `kind '${input.kind}' is 'shared' but carries a humanId` };
    }
    if (input.kind === 'propose' && this.proposalIds.has(input.id)) {
      return { valid: false, error: `duplicate proposal id: ${input.id}` };
    }
    if (
      (input.kind === 'revise' || input.kind === 'approve' || input.kind === 'reject') &&
      !this.proposalIds.has(input.proposal)
    ) {
      return { valid: false, error: `unknown proposal: ${input.proposal}` };
    }

    // Review validation. Reviews are advisory records: they do not change
    // proposal status. The human's approve/reject events are the sole
    // authoritative status transition. Higher-level semantics (self-review
    // policy, quorum) are deliberately out of scope for the gate — the schema
    // enforces structure, not policy. Self-review currently records; a future
    // policy may forbid it at a higher layer.
    if (input.kind === 'review') {
      if (typeof input.agent !== 'string' || input.agent.trim().length === 0) {
        return { valid: false, error: 'review.agent must be a non-empty string' };
      }
      if (!this.proposalIds.has(input.proposalId)) {
        return { valid: false, error: `review references unknown proposal: ${input.proposalId}` };
      }
      const currentRev = this.proposalRevisions.get(input.proposalId) ?? 0;
      if (input.revision !== currentRev) {
        return {
          valid: false,
          error: `review revision ${input.revision} does not match current revision ${currentRev} for proposal ${input.proposalId}`,
        };
      }
      if (input.decision !== 'approve' && (!input.reason || input.reason.trim().length === 0)) {
        return { valid: false, error: `review with decision '${input.decision}' requires a non-empty reason` };
      }
    }

    // view.save validation. A saved read is a canonical event: it names a
    // window of the log. The label is the human's name for the read; the
    // window must be non-empty, ordered, and within the log the gate has seen
    // so far. `to` is inclusive and must reference an event that exists.
    if (input.kind === 'view.save') {
      if (typeof input.label !== 'string' || input.label.trim().length === 0) {
        return { valid: false, error: 'view.save requires a non-empty label' };
      }
      if (!Number.isInteger(input.from) || !Number.isInteger(input.to)) {
        return { valid: false, error: 'view.save from/to must be integers' };
      }
      if (input.from < 0 || input.to < input.from) {
        return { valid: false, error: `view.save requires 0 <= from <= to (got ${input.from}..${input.to})` };
      }
      if (input.to >= this.seq) {
        return { valid: false, error: `view.save.to ${input.to} is beyond the log head (${this.seq - 1})` };
      }
    }

    // Control-server configuration events. Structural validation only — the
    // gate proves the event is well-formed and the routing stays one-to-one;
    // it does NOT know the synth engines' param registries (that is the
    // ControlRoom DO's domain, per the layering in the build prompt §3.1).
    // The source grammar: a UI control id, a MIDI input on a channel, an OSC
    // path, or the WLED sync source. Destination ids are opaque strings the
    // DO resolves against its routing table.
    const SOURCE_RE = /^(ui:control-[\w-]+|midi:in-\d+|osc:\/[\w\/]+|wled:sync)$/;
    if (input.kind === 'control.mapping.set') {
      if (typeof input.source !== 'string' || !SOURCE_RE.test(input.source)) {
        return { valid: false, error: `control.mapping.set has an invalid source '${String(input.source)}'` };
      }
      if (typeof input.destination !== 'string' || input.destination.trim().length === 0) {
        return { valid: false, error: 'control.mapping.set requires a non-empty destination' };
      }
      if (typeof input.mapping !== 'object' || input.mapping === null || Array.isArray(input.mapping)) {
        return { valid: false, error: 'control.mapping.set requires a mapping object' };
      }
      // MVP one-to-one rule: a destination cannot be bound to a different
      // source, and a source cannot be bound to a different destination — one
      // knob, one mapping, one destination (§11). Fan-out is a later unlock;
      // the gate enforces the MVP here so the routing stays provable.
      const bound = this.routing.get(input.destination);
      if (bound !== undefined && bound !== input.source) {
        return { valid: false, error: `control.mapping.set rejects: destination '${input.destination}' is already bound to source '${bound}'` };
      }
      const boundDest = this.routingBySource.get(input.source);
      if (boundDest !== undefined && boundDest !== input.destination) {
        return { valid: false, error: `control.mapping.set rejects: source '${input.source}' is already bound to destination '${boundDest}'` };
      }
      this.routing.set(input.destination, input.source);
      this.routingBySource.set(input.source, input.destination);
    } else if (input.kind === 'control.mapping.clear') {
      if (typeof input.source !== 'string' || !SOURCE_RE.test(input.source)) {
        return { valid: false, error: `control.mapping.clear has an invalid source '${String(input.source)}'` };
      }
      if (typeof input.destination !== 'string' || input.destination.trim().length === 0) {
        return { valid: false, error: 'control.mapping.clear requires a non-empty destination' };
      }
      // Idempotent: clearing a pair that is not bound is a no-op, not an
      // error. Only the exact source→destination pair unbinds both maps.
      const boundTo = this.routing.get(input.destination);
      if (boundTo === input.source) {
        this.routing.delete(input.destination);
        this.routingBySource.delete(input.source);
      }
    } else if (input.kind === 'control.patch.set') {
      if (input.engine !== 'polysynth' && input.engine !== 'noisemachine' && input.engine !== 'drumkit') {
        return { valid: false, error: `control.patch.set has an unknown engine '${String(input.engine)}'` };
      }
      if (typeof input.params !== 'object' || input.params === null || Array.isArray(input.params)) {
        return { valid: false, error: 'control.patch.set requires a params object' };
      }
      const params = input.params as Record<string, unknown>;
      const keys = Object.keys(params);
      if (keys.length === 0) return { valid: false, error: 'control.patch.set params must not be empty' };
      for (const [k, v] of Object.entries(params)) {
        if (typeof v !== 'number' && typeof v !== 'string') {
          return { valid: false, error: `control.patch.set param '${k}' must be a number or string, got ${typeof v}` };
        }
      }
    } else if (input.kind === 'control.midi.learn') {
      if (typeof input.source !== 'string' || !SOURCE_RE.test(input.source)) {
        return { valid: false, error: `control.midi.learn has an invalid source '${String(input.source)}'` };
      }
      if (typeof input.controlId !== 'string' || input.controlId.trim().length === 0) {
        return { valid: false, error: 'control.midi.learn requires a non-empty controlId' };
      }
      if (!Number.isInteger(input.cc) || input.cc < 0 || input.cc > 127) {
        return { valid: false, error: `control.midi.learn cc must be an integer 0..127, got ${input.cc}` };
      }
    }

    const seq = this.seq;
    const event = { ...input, seq, ts: new Date().toISOString() } as LoomEvent;
    if (input.kind === 'propose') {
      this.proposalIds.add(input.id);
      this.proposalRevisions.set(input.id, 0);
    } else if (input.kind === 'revise') {
      this.proposalRevisions.set(input.proposal, (this.proposalRevisions.get(input.proposal) ?? 0) + 1);
    }
    this.log.push(event);
    this.seq = seq + 1;
    return { valid: true };
  }

  /** Replay the whole log twice and compare canonical state. Determinism proof. */
  verify(reducer: Reducer = defaultReduce, seed: LoomState = initialState()): GateResult {
    const a = this.fold(reducer, seed);
    const b = this.fold(reducer, seed);
    if (canonicalize(a) !== canonicalize(b)) {
      return { valid: false, error: 'reducer is nondeterministic (two folds diverged)' };
    }
    return { valid: true };
  }

  private fold(reducer: Reducer, seed: LoomState): LoomState {
    let s = seed;
    for (const e of this.log) s = reducer(s, e);
    return s;
  }

  /** State after folding events with seq <= until. For the canvas scrubber. */
  stateAt(seq: number, reducer: Reducer = defaultReduce, seed: LoomState = initialState()): LoomState {
    let s = seed;
    for (const e of this.log) {
      if (e.seq > seq) break;
      s = reducer(s, e);
    }
    return s;
  }

  toJSONL(): string {
    return this.log.map((e) => JSON.stringify(e)).join('\n');
  }

  fromJSONL(text: string): GateResult {
    this.log = [];
    this.proposalIds = new Set();
    this.proposalRevisions = new Map();
    this.routing = new Map();
    this.routingBySource = new Map();
    this.seq = 0;
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      let parsed: LoomEvent;
      try {
        parsed = JSON.parse(line) as LoomEvent;
      } catch {
        return { valid: false, error: `corrupt line: ${line.slice(0, 48)}` };
      }
      const { seq, ts, ...rest } = parsed as LoomEvent & { seq: number; ts: string };
      const r = this.append(normalizeLegacyScope(rest as LoomEventInput));
      if (!r.valid) return r;
      const last = this.log[this.log.length - 1];
      last.seq = seq;
      last.ts = ts;
      this.seq = Math.max(this.seq, seq + 1);
    }
    return { valid: true };
  }

  getLog(): readonly LoomEvent[] {
    return this.log;
  }

  getLogLength(): number {
    return this.log.length;
  }
}
