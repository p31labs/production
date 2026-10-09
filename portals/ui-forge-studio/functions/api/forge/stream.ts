/**
 * api/forge/stream.ts — SSE streaming forge endpoint (Wave 0, Agent B).
 *
 * POST /api/forge/stream — runs the same generation tetrahedron as /api/forge
 * (Grounder → Dreamer → Shaper → Governor → Center), but streams every
 * ForgeEvent as a `text/event-stream` frame (`event: <type>\ndata: <json>\n\n`)
 * per the frozen contract in src/lib/events.ts.
 *
 * Dreamer traffic routes through the PHOS_AI_PROXY service binding
 * (server-to-server, no worker→worker 1042). The canon catalog is injected
 * from forge-schema.json (bundled — no node:fs).
 *
 * Lifecycle:
 *   - `forge(spec, { emit })` — each plain object the engine emits is
 *     normalized to a ForgeEvent (contract discriminants + `at`) and enqueued.
 *   - completion → `stream.end` reason 'complete'.
 *   - engine error / 60s timeout → `stream.end` reason 'error', then close.
 *   - client disconnect (request.signal / stream cancel) → abort in-flight
 *     Dreamer fetches and stop enqueuing; the stream closes silently.
 *
 * The vendored center.mjs does not yet invoke `emit`, so the endpoint also
 * synthesizes a faithful terminal sequence from the report when the engine
 * emitted nothing itself (guarded by an emit counter → no duplication once
 * the emit-capable center lands).
 */
import { forge } from '@p31ca/ui-forge/src/center.mjs';
import uiSchema from '../../../src/forge-schema.json';
import { ForgeEvent, toSseFrame, eventName } from '../../../src/lib/events';
import { consumeRun, type EntitlementEnv } from '../../_lib/entitlement';
import { logAuditEvent } from '../../_lib/audit';
import type { SessionData } from '../../_middleware';

const STREAM_TIMEOUT_MS = 60_000;

/** The frozen set of ForgeEvent discriminants (src/lib/events.ts). */
const KNOWN_EVENTS = new Set([
  'pipeline.stage',
  'agent.start',
  'agent.think',
  'agent.tool',
  'agent.result',
  'agent.done',
  'repair.applied',
  'repair.fallback',
  'gate.verdict',
  'artifact.preview',
  'artifact.final',
  'stream.end',
]);

interface ForgeStreamEnv extends EntitlementEnv {
  PHOS_AI_PROXY?: Fetcher;
  AUTH_DB?: D1Database;
}

interface ForgeStreamBody {
  title?: string;
  entities?: Array<{ name?: string; fields?: Array<{ name: string; type: string }> }>;
  actions?: Array<{ name?: string }>;
  k?: number;
}

export const onRequestPost: PagesFunction<ForgeStreamEnv, string, SessionData> = async ({ request, env, data }) => {
  const session = data as SessionData;
  const headerDid = request.headers.get('X-Forge-Did')?.trim();
  const did = session.did ?? (headerDid && headerDid.startsWith('did:key:') ? headerDid : null) ?? null;

  let body: ForgeStreamBody;
  try {
    body = (await request.json()) as ForgeStreamBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // ── Meter the run BEFORE the pipeline (Wave 3). ────────────────────────
  // The entitlement worker returns 402 { error: 'over-allowance' } when the
  // did has no allowance left. On over-allowance we emit a warm terminal SSE
  // event (never an error wall) plus a header the UI reads, then close.
  const entitlement = await consumeRun(env, did);
  if (!entitlement.allowed) {
    const denyEvent: ForgeEvent = { type: 'stream.end', reason: 'error', error: 'over-allowance', at: Date.now() };
    const encoder = new TextEncoder();
    const deny = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(toSseFrame(denyEvent)));
        controller.close();
      },
    });
    return new Response(deny, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Forge-Entitlement': 'over-allowance',
        'X-Forge-Remaining': entitlement.remaining ?? '0',
      },
    });
  }

  // Build the backend spec exactly like schema.ts.
  const spec = {
    title: body.title ?? 'Untitled surface',
    entities: (body.entities ?? []).map((e) => ({ name: e.name, fields: e.fields ?? [] })),
    actions: (body.actions ?? []).map((a) => ({ name: a.name })),
  };
  const k =
    typeof body.k === 'number' && Number.isFinite(body.k) ? Math.max(1, Math.floor(body.k)) : 4;

  // Abort signal: fires on client disconnect OR the hard 60s timeout. Wired
  // into the Dreamer's fetchImpl so in-flight provider calls are cancelled.
  const abort = new AbortController();
  let closed = false;
  let clientGone = false;
  let emitCount = 0;
  const encoder = new TextEncoder();
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | undefined;

  function closeStream(): void {
    clearTimeout(timeout);
    closed = true;
    try {
      controllerRef?.close();
    } catch {
      // already closed — fine.
    }
  }

  function onClientGone(): void {
    clientGone = true;
    closed = true;
    abort.abort();
    clearTimeout(timeout);
  }
  request.signal.addEventListener('abort', onClientGone);

  const timeout = setTimeout(() => {
    abort.abort();
    if (!clientGone && !closed) {
      emitEvent({ type: 'stream.end', reason: 'error', at: Date.now() });
    }
    closeStream();
  }, STREAM_TIMEOUT_MS);

  // The Dreamer's provider: route through the service binding (mirror
  // schema.ts) so server-to-server binding works with no 1042, and thread the
  // abort signal through so disconnect/timeout cancels in-flight fetches.
  const providerOpts = {
    endpoint: 'https://phos-ai-proxy/',
    fetchImpl: (url: RequestInfo | URL, init?: RequestInit) => {
      const opts = { ...(init ?? {}), signal: abort.signal };
      if (env.PHOS_AI_PROXY) return env.PHOS_AI_PROXY.fetch(url, opts);
      return fetch(url, opts);
    },
    // Workers AI JSON Mode: constrain the Dreamer to the ui-schema component
    // tree (closed enum, per-component props).
    schema: uiSchema.schema,
  };

  /** Convert a plain emitted object into a contract-conformant ForgeEvent.
   *  Unknown discriminants are dropped; `at` is stamped when missing. */
  function normalize(raw: unknown): ForgeEvent | null {
    if (!raw || typeof raw !== 'object') return null;
    const ev = raw as Record<string, unknown>;
    if (typeof ev.type !== 'string') return null;
    const at = typeof ev.at === 'number' ? ev.at : Date.now();
    const out = { ...ev, at } as unknown as ForgeEvent;
    if (!KNOWN_EVENTS.has(eventName(out))) return null;
    return out;
  }

  function emitEvent(ev: ForgeEvent): void {
    if (closed) return;
    // Tamper-evident trail (Wave 3): every emitted event is logged, best-effort.
    void logAuditEvent(env.AUTH_DB, did, ev);
    try {
      controllerRef?.enqueue(encoder.encode(toSseFrame(ev)));
    } catch {
      closed = true;
    }
  }

  /** The `emit` callback handed to forge. */
  const emit = (raw: unknown): void => {
    const ev = normalize(raw);
    if (!ev) return;
    emitCount += 1;
    emitEvent(ev);
  };

  /** Terminal summary emitted when the vendored center never calls `emit`. */
  function synthesize(report: unknown): void {
    const now = Date.now();
    const stages = ['intent', 'ground', 'dream', 'repair', 'shape', 'gate'] as const;
    for (const stage of stages) {
      emitEvent({ type: 'pipeline.stage', stage, status: 'start', at: now });
      emitEvent({ type: 'pipeline.stage', stage, status: 'done', at: now });
    }
    const r = report as { artifact?: unknown; gate?: { status?: string; state?: Record<string, number> } } | null;
    if (r?.artifact != null) {
      emitEvent({ type: 'artifact.final', tree: r.artifact, at: now });
    }
    if (r?.gate) {
      const status =
        r.gate.status === 'pass' ? 'pass' : r.gate.status === 'incomplete' ? 'incomplete' : r.gate.status === 'needs-review' ? 'needs-review' : 'needs-revision';
      emitEvent({ type: 'gate.verdict', status, axes: r.gate.state ?? {}, source: 'artifact', at: now });
    }
  }

  async function run(): Promise<void> {
    try {
      if (request.signal.aborted || clientGone) return;
      const report = await forge(spec, {
        k,
        catalog: uiSchema.catalog,
        providerOpts,
        signal: abort.signal,
        emit,
      });
      if (clientGone) return;
      if (emitCount === 0) synthesize(report);
      if (!closed) emitEvent({ type: 'stream.end', reason: 'complete', at: Date.now() });
    } catch {
      if (!clientGone && !closed) emitEvent({ type: 'stream.end', reason: 'error', at: Date.now() });
    } finally {
      closeStream();
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
      void run();
    },
    cancel() {
      onClientGone();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
};