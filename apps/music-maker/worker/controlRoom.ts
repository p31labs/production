/**
 * The music maker — ControlRoom Durable Object (the control server).
 *
 * A NEW DO class, sibling to MusicRoom (its own binding; the proven
 * music-presence transport is untouched). Routes control messages between
 * surfaces:
 *
 *   WS /ui    — the browser control surface (knobs, faders, the matrix)
 *   WS /midi  — hardware MIDI bridges (Web MIDI in the browser, or a future
 *                Node sidecar for MIDI 2.0 / UMP)
 *   WS /osc   — OSC peers (a Node sidecar — OSC/UDP cannot run in a Worker;
 *                see bridge/osc.mjs)
 *
 * One source of truth, two planes (the build prompt §1.2):
 *   • COMMITTED — mappings, patches, learn intents go through the SAME canon
 *     ReplayGate + hash-chain as instrument.* events (shared log.ts adapter).
 *     The `events` table is the log; this DO's routing tables are a CACHE of
 *     that log, rehydrated on wake — never a parallel truth.
 *   • EPHEMERAL — the live 60Hz control stream (knob drag, MIDI CC run, OSC
 *     gesture). Token-bucketed at 60Hz; on overload a structured
 *     `backpressure` drop event is emitted instead of silent degradation.
 *
 * Hibernation (research-grounded, Cloudflare best practice): in-memory maps die
 * on eviction, so a small durable CHECKPOINT — the committed fold snapshot —
 * lives in DO storage (`control:fold`) and is written on every commit, awaited
 * BEFORE the broadcast. The ordering invariant makes the wake path correct
 * without any D1 read: a socket can never see a state newer than the checkpoint
 * (the DO only broadcasts after the checkpoint write succeeds), so on wake the
 * fold rebuilds from the checkpoint blob — a single local storage get, not a
 * full `events` scan. Attachments carry `foldVersion` per connection (the
 * Cloudflare-recommended per-socket state + cross-check). The D1 log is only
 * read on a genuine cold start (no checkpoint yet). The constructor stays
 * minimal for fast wake; there is no setInterval (the runtime's ping auto-
 * response keeps sockets alive without waking the object), and checkpoint
 * writes are state changes, never a heartbeat.
 *
 * Frame cap (Tier 1c, same as MusicRoom): a child mashing a knob must not be
 * able to flood the room with a multi-MB frame — reject over the cap before
 * parse.
 *
 * The 64-destination budget (§1.5): refuse past MAX_DESTINATIONS with a
 * structured error, never degrade silently.
 */

import { DurableObject } from 'cloudflare:workers';
import type { LoomEvent } from '@p31ca/canon/loom/events';
import { readEvents, appendEvent, type LogEnv } from './log.ts';

export interface ControlRoomEnv extends LogEnv {
  CONTROL_ROOM: DurableObjectNamespace<ControlRoom>;
}

/** Max inbound WS frame size (bytes). */
const MAX_FRAME_BYTES = 64 * 1024;
/** The ephemeral control budget (§3.1) — 60 moves/sec, token-bucketed. */
const RATE_HZ = 60;
/** Family-scale destination budget (§1.5) — refuse past this. */
const MAX_DESTINATIONS = 64;
/** Learn intents disarm after this long even if the physical knob never moves. */
const LEARN_TTL_MS = 30_000;
/** DO storage key holding the durable fold checkpoint (the committed fold
 *  snapshot at a given seq). This is the single Hibernation-safe source the
 *  wake path reads — NOT the D1 log. */
const FOLD_KEY = 'control:fold';

interface MappingView {
  source: string;
  destination: string;
  mapping: Record<string, unknown>;
}

interface PatchView {
  id: string;
  engine: 'polysynth' | 'noisemachine' | 'drumkit';
  params: Record<string, number | string>;
}

/** A committed routing entry, cached from the log. `destination -> mapping` */
interface RoutingEntry {
  source: string;
  destination: string;
  mapping: Record<string, unknown>;
}

/** A pending MIDI learn: a control awaiting its first physical CC. Keyed by
 *  controlId (the DAW convention — the UI arms a control, the user moves the
 *  physical knob, the arriving CC binds). The arm is EPHEMERAL per-session;
 *  the resolved mapping is what commits. */
interface PendingLearn {
  controlId: string;
  /** The source that armed this learn (midi:in-*, ui:control-*, or null for a
   *  UI-armed learn awaiting any source). Kept for the audit trail. */
  source: string | null;
  armedAt: number;
}

/** The durable fold checkpoint — serialized to DO storage on every commit.
 *  Includes armed learns so a hibernation wake reconstructs a pending
 *  learn exactly as it was (the log records the intent; the fold restores it). */
interface FoldCheckpoint {
  /** The committed seq the checkpoint reflects. */
  seq: number;
  /** The fold as flat arrays (structured-clone-safe). */
  mappings: MappingView[];
  patches: PatchView[];
  /** Armed learns as flat records — rebuilt into the `controlId` map on wake.
   *  Only controls inside their TTL survive the wake (an expired arm is a
   *  dead intent; the log still records the committed learn for audit). */
  pendingLearn: Array<{ controlId: string; source: string | null; armedAt: number }>;
}

function structuredLog(env: ControlRoomEnv, event: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ app: 'control-room', ...event }));
}

/** Sanitize an ephemeral control frame at the DO boundary. Returns the clean
 *  frame, or null to reject. `cc` is optional (a UI knob move has no CC); a
 *  MIDI or learn frame carries it. `value` must be a finite number (the synth
 *  params are 0-1 named controls; clamped here, policy lives in the engines). */
function sanitizeControl(msg: Record<string, unknown>): {
  type: 'control';
  source: string;
  cc?: number;
  value: number;
} | null {
  if (msg.type !== 'control') return null;
  if (typeof msg.source !== 'string' || msg.source.length === 0 || msg.source.length > 128) return null;
  const value = typeof msg.value === 'number' && Number.isFinite(msg.value) ? msg.value : NaN;
  if (Number.isNaN(value)) return null;
  let cc: number | undefined;
  if (msg.cc !== undefined) {
    cc = Number(msg.cc);
    if (!Number.isInteger(cc) || cc < 0 || cc > 127) return null;
  }
  return { type: 'control', source: msg.source, value, ...(cc !== undefined ? { cc } : {}) };
}

export class ControlRoom extends DurableObject<ControlRoomEnv> {
  /** destination -> RoutingEntry (the fold of committed control.mapping.* events). */
  private routing = new Map<string, RoutingEntry>();
  /** source -> destination (inverse fold, for the fan-out lookup). */
  private sourceToDest = new Map<string, string>();
  /** committed control.patch.set entries by id. */
  private patches = new Map<string, PatchView>();
  /** `controlId` -> PendingLearn — armed by `learn-arm` (UI) or a committed
   *  control.midi.learn (explicit path), disarmed by the first physical CC
   *  move that resolves it (the DAW convention: arm a control, move the knob). */
  private pendingLearn = new Map<string, PendingLearn>();
  /** The last committed seq this fold has applied. -1 = never hydrated. */
  private routingSeq = -1;
  /** How this instance got its fold — for observability and the smoke test:
   *  'cold-start' = folded from the D1 log (first run / no checkpoint),
   *  'checkpoint' = restored from the DO-storage fold checkpoint (a wake). */
  private hydrationMode: 'cold-start' | 'checkpoint' = 'cold-start';
  /** In-memory guard: this instance has already restored/held the fold. Lives
   *  only as long as the instance; after eviction it is false again, so a fresh
   *  wake re-reads the checkpoint exactly once. Commits then keep the same maps
   *  in sync — no repeated storage reads while the instance is alive. */
  private hydrated = false;
  /** Token bucket for the 60Hz ephemeral budget. */
  private tokens = RATE_HZ;
  private lastRefillAt = Date.now();

  constructor(ctx: DurableObjectState, env: ControlRoomEnv) {
    super(ctx, env);
    // Application-level auto-response (Cloudflare Hibernation best practice):
    // a client keepalive `ping` is answered by the RUNTIME at the edge
    // WITHOUT waking the DO. The surface sends `ping` periodically; without
    // this, every ping wakes the object and defeats the hibernation cost
    // goal. The constructor stays minimal otherwise — the fold is hydrated
    // lazily in fetch/webSocketMessage, never here.
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Health — the post-flight gate (§10.3) probes the DO. The top-level
    // worker routes /control/health here (the DO sees the full /control/ prefix,
    // like MusicRoom sees /api/music/stream).
    if (url.pathname === '/control/health' || url.pathname === '/health') {
      await this.ensureHydrated();
      return Response.json({ ok: true, do: 'control-room', destinations: this.routing.size, seq: this.routingSeq, hydrationMode: this.hydrationMode });
    }

    const upgrade = request.headers.get('Upgrade');
    if (!url.pathname.match(/^\/control\/(ui|midi|osc)$/) || upgrade?.toLowerCase() !== 'websocket') {
      return new Response('not found', { status: 404 });
    }

    await this.ensureHydrated();
    const path = url.pathname.replace(/^\/control\//, '');
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    // Per-connection state that survives hibernation (Cloudflare's recommended
    // serializeAttachment pattern). foldVersion is a cross-check against the
    // durable checkpoint, not the source of truth.
    server.serializeAttachment({ joinedAt: Date.now(), path, foldVersion: this.routingSeq });
    structuredLog(this.env, { ev: 'ws_connected', path, hydrationMode: this.hydrationMode });

    // Snapshot on connect — the client reconciles the committed control state
    // from the fold (mappings + patches), exactly like MusicRoom's
    // committed-resume. Ephemeral state (learn arming) is NOT replayed; it is
    // per-session by nature.
    server.send(JSON.stringify({
      type: 'control-snapshot',
      seq: this.routingSeq,
      hydrationMode: this.hydrationMode,
      mappings: [...this.routing.values()].map(({ source, destination, mapping }) => ({ source, destination, mapping })),
      patches: [...this.patches.values()],
    }));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // Tier 1c: frame size cap before any parse.
    const size = typeof message === 'string' ? message.length : message.byteLength;
    if (size > MAX_FRAME_BYTES) {
      structuredLog(this.env, { ev: 'ws_frame_oversize', bytes: size });
      ws.send(JSON.stringify({ type: 'frame-rejected', error: 'frame too large' }));
      return;
    }
    if (typeof message !== 'string') return;
    // The client's keepalive 'ping' — the edge's auto-response answers it
    // without waking the DO; nothing to do here.
    if (message === 'ping') return;

    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(message) as Record<string, unknown>;
    } catch {
      return;
    }

    await this.ensureHydrated();

    const isCommit = msg.input !== undefined && typeof msg.input === 'object';
    const requestId = typeof msg.requestId === 'string' ? msg.requestId : undefined;
    const ack = (valid: boolean, payload: Record<string, unknown>, error?: string) => {
      if (requestId) ws.send(JSON.stringify({ type: 'control-ack', requestId, valid, ...payload, ...(error ? { error } : {}) }));
    };

    if (isCommit) {
      try {
        const input = msg.input as { kind: string } & Record<string, unknown>;
        const event = await this.commitInput(input);
        ack(true, { seq: event.seq, kind: event.kind });
        // Broadcast the committed event with an explicit `type` marker so a
        // client can distinguish a committed control event (type = the event
        // kind) from an ephemeral frame (type: 'control').
        this.broadcast({ ...event, type: event.kind });
        structuredLog(this.env, { ev: 'ws_committed', seq: event.seq, kind: event.kind });
        return;
      } catch (e) {
        structuredLog(this.env, { ev: 'ws_commit_rejected', error: String(e) });
        ack(false, {}, String(e));
        return;
      }
    }

    // Ephemeral learn arm — the DAW convention. The UI arms a control by id;
    // the next physical CC move resolves it (binds the mapping). The arm is
    // per-session and never committed — the RESOLVED mapping is the log entry.
    if (msg.type === 'learn-arm') {
      const controlId = typeof msg.controlId === 'string' ? msg.controlId : '';
      if (!controlId || controlId.length > 128) {
        ws.send(JSON.stringify({ type: 'frame-rejected', error: 'malformed learn-arm frame' }));
        return;
      }
      this.armLearn(controlId, null);
      ws.send(JSON.stringify({ type: 'learn-armed', controlId }));
      return;
    }

    // Ephemeral learn disarm — the user changed their mind (or a gesture ended
    // without a CC). Clears the arm so it can't fire on a later, unrelated CC.
    if (msg.type === 'learn-disarm') {
      const controlId = typeof msg.controlId === 'string' ? msg.controlId : '';
      if (controlId) this.pendingLearn.delete(controlId);
      ws.send(JSON.stringify({ type: 'learn-disarmed', controlId }));
      return;
    }

    // Ephemeral control move — the live 60Hz stream.
    const clean = sanitizeControl(msg);
    if (!clean) {
      ws.send(JSON.stringify({ type: 'frame-rejected', error: 'malformed control frame' }));
      return;
    }
    this.consumeAndFanOut(clean);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const att = ws.deserializeAttachment() as { path?: string } | null;
    structuredLog(this.env, { ev: 'ws_disconnected', path: att?.path ?? 'unknown' });
  }

  // ── The ephemeral path — fan-out with backpressure. ─────────────────────────
  /** Token bucket: refill at RATE_HZ/sec up to the burst, consume one token per
   *  frame. Returns false when the budget is exhausted (drop this frame). */
  private takeToken(): boolean {
    const now = Date.now();
    this.tokens = Math.min(RATE_HZ, this.tokens + ((now - this.lastRefillAt) / 1000) * RATE_HZ);
    this.lastRefillAt = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }

  private consumeAndFanOut(clean: ReturnType<typeof sanitizeControl>): void {
    if (!clean) return;
    if (!this.takeToken()) {
      // Structured backpressure (§3.1 step 3): emit a drop event, never degrade
      // silently. The budget is per-DO, so a single mashing client can exhaust
      // it for everyone — the honest signal, and the UI should show it.
      this.broadcast({ type: 'backpressure', reason: 'rate_limit', budgetHz: RATE_HZ, dropped: 1 });
      return;
    }

    // Learn resolution: if a control is armed, the FIRST physical CC move
    // (any midi source) binds it. The DAW convention: arm a control, move the
    // knob you want it mapped to. UI-armed learns accept any source; an
    // explicitly-armed learn (committed midi.learn) binds its declared source.
    if (clean.cc !== undefined && this.pendingLearn.size > 0) {
      const now = Date.now();
      let resolved: PendingLearn | null = null;
      for (const [controlId, p] of this.pendingLearn) {
        if (now - p.armedAt >= LEARN_TTL_MS) {
          this.pendingLearn.delete(controlId); // stale — disarm quietly
          continue;
        }
        if (p.source === null || p.source === clean.source) {
          resolved = { controlId, source: clean.source, armedAt: p.armedAt };
          this.pendingLearn.delete(controlId);
          break;
        }
      }
      if (resolved) {
        // Commit the resolved mapping — the learn flow's output is a mapping
        // (the log is the source of truth), then fan out the move to it.
        void this.resolveLearn(clean.source, resolved.controlId, clean.value, clean.cc).catch((e) => {
          structuredLog(this.env, { ev: 'learn_resolve_failed', error: String(e) });
        });
        return;
      }
    }

    // Route by source: source -> destination from the committed fold.
    const destination = this.sourceToDest.get(clean.source);
    if (!destination) return; // unmapped source: drop (no fake state)
    const frame = { type: 'control', source: clean.source, destination, value: clean.value, ts: Date.now() };
    this.broadcast(frame);
  }

  // ── The committed path — through the canon gate. ────────────────────────────
  /** Commit a control.* input through the shared ReplayGate adapter. Updates the
   *  in-memory fold + durable checkpoint only after the D1 write succeeds, so
   *  the cache never gets ahead of the log. Throws with the gate's rejection. */
  private async commitInput(input: { kind: string } & Record<string, unknown>): Promise<LoomEvent> {
    switch (input.kind) {
      case 'control.mapping.set': {
        if (typeof input.source !== 'string' || typeof input.destination !== 'string') {
          throw new Error('control.mapping.set requires string source + destination');
        }
        const mapping = (input.mapping as Record<string, unknown> | undefined) ?? {};
        if (this.routing.size >= MAX_DESTINATIONS && !this.routing.has(input.destination)) {
          throw new Error(`destination budget reached: ${MAX_DESTINATIONS} mappings`);
        }
        const event = await appendEvent(this.env, {
          writer: 'human',
          kind: 'control.mapping.set',
          source: input.source,
          destination: input.destination,
          mapping,
        });
        this.applyMappingSet(input.source, input.destination, mapping);
        this.projectMappingSet(input.source, input.destination, mapping);
        await this.persistCheckpoint();
        return event;
      }
      case 'control.mapping.clear': {
        if (typeof input.source !== 'string' || typeof input.destination !== 'string') {
          throw new Error('control.mapping.clear requires string source + destination');
        }
        const event = await appendEvent(this.env, {
          writer: 'human',
          kind: 'control.mapping.clear',
          source: input.source,
          destination: input.destination,
        });
        this.applyMappingClear(input.source, input.destination);
        this.projectMappingClear(input.destination);
        await this.persistCheckpoint();
        return event;
      }
      case 'control.patch.set': {
        if (input.engine !== 'polysynth' && input.engine !== 'noisemachine' && input.engine !== 'drumkit') {
          throw new Error(`control.patch.set has an unknown engine '${String(input.engine)}'`);
        }
        const params = (input.params as Record<string, number | string> | undefined) ?? {};
        const engine = input.engine as 'polysynth' | 'noisemachine' | 'drumkit';
        const event = await appendEvent(this.env, {
          writer: 'human',
          kind: 'control.patch.set',
          engine,
          params,
        });
        this.patches.set(`patch:${event.seq}`, { id: `patch:${event.seq}`, engine, params });
        this.projectPatch(`patch:${event.seq}`, engine, params);
        await this.persistCheckpoint();
        return event;
      }
      case 'control.midi.learn': {
        if (typeof input.source !== 'string' || typeof input.controlId !== 'string') {
          throw new Error('control.midi.learn requires string source + controlId');
        }
        const cc = Number(input.cc);
        if (!Number.isInteger(cc) || cc < 0 || cc > 127) throw new Error(`control.midi.learn cc must be 0..127, got ${input.cc}`);
        const event = await appendEvent(this.env, {
          writer: 'human',
          kind: 'control.midi.learn',
          source: input.source,
          controlId: input.controlId,
          cc,
        });
        // Explicit learn: arm the controlId, bound to its declared source.
        this.armLearn(input.controlId, input.source);
        await this.persistCheckpoint();
        return event;
      }
      default:
        throw new Error(`unknown control kind: ${input.kind}`);
    }
  }

  /** The learn → bind transition: commit the resolved mapping (source → the
   *  control's synth param), which updates the fold, then fan out BOTH the
   *  committed event (so every client sees the binding land) and the move
   *  that resolved it. The mapping records the physical CC. */
  private async resolveLearn(source: string, controlId: string, value: number, cc?: number): Promise<void> {
    const mapping = cc !== undefined ? { cc, value } : { value };
    const event = await appendEvent(this.env, {
      writer: 'human',
      kind: 'control.mapping.set',
      source,
      destination: `synth:param-${controlId}`,
      mapping,
    });
    this.applyMappingSet(source, `synth:param-${controlId}`, mapping);
    this.projectMappingSet(source, `synth:param-${controlId}`, mapping);
    await this.persistCheckpoint();
    // The committed event with its `type` marker — every client reconciles the
    // new binding the same way it reconciles any committed mapping.set.
    this.broadcast({ ...event, type: event.kind });
    const frame = { type: 'control', source, destination: `synth:param-${controlId}`, value, ts: Date.now() };
    this.broadcast(frame);
  }

  // ── The fold — cache of the committed log, checkpointed for Hibernation. ─────
  /** Ensure the fold reflects the committed log. On wake after eviction the
   *  in-memory maps are gone, but a durable CHECKPOINT survives in DO storage —
   *  the wake path restores from it (a single local storage get) and only falls
   *  back to a full D1 `events` scan on a genuine cold start (no checkpoint yet).
   *
   *  Why this is correct without consulting the log on wake: the checkpoint is
   *  written on every commit, AWAITED before the broadcast. So a socket can
   *  never carry a fold version newer than the checkpoint — the DO is the only
   *  writer, and it never broadcasts state the checkpoint doesn't yet hold.
   *  The attached foldVersion is therefore a cross-check, not the source of
   *  truth. See the local-first hibernation strategy this mirrors. */
  private async ensureHydrated(): Promise<void> {
    if (this.hydrated) return;
    const cp = await this.ctx.storage.get<FoldCheckpoint>(FOLD_KEY);
    if (cp) {
      this.applyCheckpoint(cp);
      this.hydrationMode = 'checkpoint';
    } else {
      // Genuine cold start: fold the whole log, then persist the checkpoint so
      // every future wake is a single storage get, not a D1 scan.
      const events = await readEvents(this.env);
      for (const event of events) this.applyEvent(event);
      // The last learn folded in the replay is never re-pruned by armLearn
      // (it only prunes older arms) — drop arms that expired while the log
      // sat, so a cold start never resurrects a dead intent.
      const now = Date.now();
      for (const [k, p] of this.pendingLearn) {
        if (now - p.armedAt >= LEARN_TTL_MS) this.pendingLearn.delete(k);
      }
      this.hydrationMode = 'cold-start';
      await this.persistCheckpoint();
    }
    this.hydrated = true;
  }

  /** Restore the fold maps from a durable checkpoint. Rebuilds the two routing
   *  indexes from the flat array so they can never drift apart. Armed learns are
   *  restored too — but only those still inside their TTL; an arm that expired
   *  while the DO slept is dropped (the intent was short-lived, and the log
   *  still records it for the audit trail). */
  private applyCheckpoint(cp: FoldCheckpoint): void {
    this.routing = new Map();
    this.sourceToDest = new Map();
    this.patches = new Map();
    this.pendingLearn = new Map();
    this.routingSeq = cp.seq;
    for (const m of cp.mappings) {
      this.routing.set(m.destination, { source: m.source, destination: m.destination, mapping: m.mapping });
      this.sourceToDest.set(m.source, m.destination);
    }
    for (const p of cp.patches) this.patches.set(p.id, p);
    const now = Date.now();
    for (const l of cp.pendingLearn) {
      if (now - l.armedAt < LEARN_TTL_MS) {
        this.pendingLearn.set(l.controlId, { controlId: l.controlId, source: l.source, armedAt: l.armedAt });
      }
    }
  }

  /** Serialize the current fold to a durable checkpoint in DO storage. This is
   *  a STATE WRITE on a genuine commit — not a heartbeat — and it is awaited
   *  before the broadcast so the invariant holds. */
  private async persistCheckpoint(): Promise<void> {
    const cp: FoldCheckpoint = {
      seq: this.routingSeq,
      mappings: [...this.routing.values()].map(({ source, destination, mapping }) => ({ source, destination, mapping })),
      patches: [...this.patches.values()],
      pendingLearn: [...this.pendingLearn.entries()].map(([controlId, { source, armedAt }]) => ({ controlId, source, armedAt })),
    };
    await this.ctx.storage.put(FOLD_KEY, cp);
  }

  /** Fold one committed event into the cache. Pure: no storage writes here —
   *  the caller persists the checkpoint exactly once after a batch (cold-start
   *  rehydrate) or after a single commit. Only control.* events mutate the
   *  cache; instrument.* events pass through untouched (the fold is not a
   *  LoomState — it is the control server's projection). */
  private applyEvent(event: LoomEvent): void {
    this.routingSeq = event.seq;
    switch (event.kind) {
      case 'control.mapping.set':
        this.applyMappingSet(event.source, event.destination, event.mapping);
        break;
      case 'control.mapping.clear':
        this.applyMappingClear(event.source, event.destination);
        break;
      case 'control.patch.set':
        this.patches.set(`patch:${event.seq}`, { id: `patch:${event.seq}`, engine: event.engine, params: event.params });
        break;
      case 'control.midi.learn':
        // A committed learn intent is folded back into the live map so a cold
        // start reconstructs armed learns from the log — the log is the truth,
        // the map is its projection. The armedAt is the event's commit time;
        // the arm is bound to the learn's declared source.
        this.armLearn(event.controlId, event.source, Date.parse(event.ts));
        break;
      default:
        break;
    }
  }

  private applyMappingSet(source: string, destination: string, mapping: Record<string, unknown>): void {
    this.routing.set(destination, { source, destination, mapping });
    this.sourceToDest.set(source, destination);
  }

  private applyMappingClear(source: string, destination: string): void {
    const entry = this.routing.get(destination);
    if (entry && entry.source === source) {
      this.routing.delete(destination);
      this.sourceToDest.delete(source);
    }
  }

  private armLearn(controlId: string, source: string | null, armedAt = Date.now()): void {
    // One learn at a time (the DAW convention): arming a control replaces ANY
    // prior arm, so a CC can never bind a control the user has already moved
    // on from. A stale arm from an earlier selection must not win by insertion
    // order.
    this.pendingLearn.clear();
    this.pendingLearn.set(controlId, { controlId, source, armedAt });
  }

  // ── The query projections (schema.sql) — derived, never authoritative. ─────
  // The `mappings`/`patches` tables are rebuildable read-models of the events
  // log: they exist for fast SQL listing and the runbook's queries, kept in
  // sync on live commits. The LOG remains the truth — a projection that drifts
  // is rebuilt by rehydrating from events, never trusted on its own. These are
  // only written on the commit path (never during rehydrate, which would
  // double-write).

  private projectMappingSet(source: string, destination: string, mapping: Record<string, unknown>): void {
    void this.env.MUSIC_D1.prepare(
      'INSERT INTO mappings (destination, source, mapping, committed_at) VALUES (?, ?, ?, ?) '
      + 'ON CONFLICT(destination) DO UPDATE SET source = excluded.source, mapping = excluded.mapping, committed_at = excluded.committed_at',
    ).bind(destination, source, JSON.stringify(mapping), new Date().toISOString()).run();
  }

  private projectMappingClear(destination: string): void {
    void this.env.MUSIC_D1.prepare('DELETE FROM mappings WHERE destination = ?').bind(destination).run();
  }

  private projectPatch(id: string, engine: 'polysynth' | 'noisemachine' | 'drumkit', params: Record<string, number | string>): void {
    void this.env.MUSIC_D1.prepare(
      'INSERT INTO patches (id, engine, params, created_at) VALUES (?, ?, ?, ?) '
      + 'ON CONFLICT(id) DO UPDATE SET engine = excluded.engine, params = excluded.params',
    ).bind(id, engine, JSON.stringify(params), new Date().toISOString()).run();
  }

  private broadcast(msg: unknown): void {
    const payload = typeof msg === 'string' ? msg : JSON.stringify(msg);
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(payload);
      } catch {
        // A socket that failed to send is cleaned up by webSocketClose.
      }
    }
  }
}