/**
 * loomEmit.ts — RLDF training-data capture for the chat sandbox.
 *
 * P3 of the tetrahedral engine: the RLDF reward model (Apple pattern) trains
 * on (original, improved) pairs of RENDERED artifacts, not text. The canon's
 * Loom already accepts `chat.artifact.generated` events with optional
 * `screenshotRef` / `screenshotRef2` (v1.2 additive extension). This module
 * feeds that substrate:
 *
 *   - `emitGenerated(artifact)` — on artifact create: stores the rendered
 *     fragment under a `screenshotRef` key (hash of the artifact code) and
 *     appends a `chat.artifact.generated` Loom event carrying the ref.
 *   - `emitRevised(artifact)` — on operator edit: stores the improved
 *     fragment as `screenshotRef2` and appends a second generated event,
 *     forming the (original, improved) pair.
 *
 * CAPTURE NOTE: the artifact preview iframe is sandboxed (opaque origin,
 * `sandbox="allow-scripts allow-modals"`, no `allow-same-origin`), so a
 * canvas drawWindow / foreignObject PNG capture from the parent is blocked.
 * Until a screenshot library (html-to-image) is added, the "screenshot ref"
 * is the serialized rendered HTML fragment (deterministic, feeds the DPO/KTO
 * text-policy layer now; the PNG layer is a drop-in when the lib lands).
 *
 * The Loom log lives in IndexedDB (`p31-sandbox`, `settings` store keyed
 * `loom-events` — append-only array). Events follow the canon writer-per-kind
 * rule (agent → chat.artifact.generated). Personal scope is never used.
 */
import { saveSetting, loadSetting } from './artifactPersistence';

const LOOM_KEY = 'loom-events';

export interface LoomEvent {
  seq: number;
  ts: string;
  writer: 'agent';
  kind: 'chat.artifact.generated';
  node: string;
  artifactId: string;
  artifactType: string;
  screenshotRef?: string;
  screenshotRef2?: string;
  description?: string;
}

/** Stable content hash for an artifact's code — the screenshotRef identity. */
export async function artifactRef(code: string): Promise<string> {
  const bytes = new TextEncoder().encode(code);
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}

/** Minimal rendered fragment (the artifact's body inside a dark P31 shell).
 *  This is the deterministic capture the DPO/KTO layer trains on today. */
export function renderFragment(code: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{background:#0A0A0F;color:#F5F5F7;font-family:system-ui,sans-serif;margin:0;padding:24px}</style></head><body>${code}</body></html>`;
}

async function readLoom(): Promise<LoomEvent[]> {
  const events = (await loadSetting(LOOM_KEY)) as LoomEvent[] | undefined;
  return Array.isArray(events) ? events : [];
}

async function appendEvent(event: LoomEvent): Promise<void> {
  const events = await readLoom();
  await saveSetting(LOOM_KEY, [...events, event]);
}

/** Emit `chat.artifact.generated` on artifact create (the original). The
 *  `description` is the natural-language spec that produced the artifact —
 *  the RLDF reward model (Apple) scores (image, description) pairs, so it
 *  must be captured for the Loom data to be a superset of the Apple format. */
export async function emitGenerated(artifact: { id: string; code: string; title?: string }): Promise<LoomEvent> {
  const ref = await artifactRef(artifact.code);
  await saveSetting(`screenshot-ref:${ref}`, renderFragment(artifact.code));
  const event: LoomEvent = {
    seq: Date.now(),
    ts: new Date().toISOString(),
    writer: 'agent',
    kind: 'chat.artifact.generated',
    node: '.ui-forge',
    artifactId: artifact.id,
    artifactType: 'ui-fragment',
    screenshotRef: `hash:${ref}`,
    description: artifact.title ?? undefined,
  };
  await appendEvent(event);
  return event;
}

/** Emit on operator edit — attaches the improved capture as screenshotRef2
 *  on the LAST generated event for this artifact, forming the (original,
 *  improved) pair the RLDF reward model trains on. */
export async function emitRevised(artifact: { id: string; code: string }): Promise<LoomEvent | null> {
  const events = await readLoom();
  const last = [...events].reverse().find((e) => e.artifactId === artifact.id);
  if (!last) return emitGenerated(artifact); // no original yet → treat as original
  const ref2 = await artifactRef(artifact.code);
  await saveSetting(`screenshot-ref:${ref2}`, renderFragment(artifact.code));
  const event: LoomEvent = {
    seq: Date.now(),
    ts: new Date().toISOString(),
    writer: 'agent',
    kind: 'chat.artifact.generated',
    node: '.ui-forge',
    artifactId: artifact.id,
    artifactType: 'ui-fragment',
    screenshotRef: last.screenshotRef,
    screenshotRef2: `hash:${ref2}`,
  };
  await appendEvent(event);
  return event;
}

/** Read the Loom events (for rldf-train.mjs export or inspection). */
export async function readLoomEvents(): Promise<LoomEvent[]> {
  return readLoom();
}