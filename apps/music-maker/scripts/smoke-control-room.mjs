#!/usr/bin/env node
/**
 * ControlRoom smoke — the Phase 2 post-flight check, mirroring the runbook's
 * two-client WS + hibernation discipline. Run against the DEPLOYED worker
 * after `wrangler deploy` + schema apply:
 *
 *   node scripts/smoke-control-room.mjs [wss://BASE] [room]
 *
 * Requires a `ws` client (a devDependency of this app — check package.json).
 * Verifies, in order:
 *   1. connect snapshot (control-snapshot with the committed fold)
 *   2. committed control.mapping.set fan-out to a second client
 *   3. ephemeral control move routes source → destination
 *   4. backpressure: a 60Hz+ burst emits the structured drop event
 *   5. hibernation wake: an idle window, then a move still fans out
 *   6. committed state survives: a fresh client snapshot sees the mapping
 */
import WebSocket from 'ws';

const BASE = process.argv[2] ?? 'wss://music-presence.trimtab-signal.workers.dev';
const ROOM = process.argv[3] ?? 'smoke';
const URL = `${BASE}/control/${ROOM === 'default' ? 'ui' : 'ui'}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
function ok(cond, label) {
  if (cond) console.log(`  ✅ ${label}`);
  else { console.error(`  ❌ ${label}`); failures++; }
}

function open() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(URL);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

/** Resolve the next message matching `pred` (or the first message when pred is
 *  null), with a timeout. */
function next(ws, pred = null, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${pred ? 'matching' : 'any'} frame`)), timeoutMs);
    const onMsg = (data) => {
      let m;
      try { m = JSON.parse(data.toString()); } catch { return; }
      if (pred && !pred(m)) return;
      clearTimeout(t);
      ws.off('message', onMsg);
      resolve(m);
    };
    ws.on('message', onMsg);
  });
}

// A committed control.mapping.set input shape (the gate's LoomEventInput).
function mappingSet(source, destination, value) {
  return JSON.stringify({
    requestId: `smoke-${Math.random().toString(36).slice(2)}`,
    input: { writer: 'human', kind: 'control.mapping.set', source, destination, mapping: { value } },
  });
}

async function main() {
  console.log(`ControlRoom smoke — ${URL}`);
  const a = await open();
  console.log('  connected (a)');
  const snapA = await next(a, (m) => m.type === 'control-snapshot');
  ok(snapA && Array.isArray(snapA.mappings), 'connect snapshot carries the committed fold');
  ok(snapA.hydrationMode === 'cold-start' || snapA.hydrationMode === 'checkpoint', `hydrationMode reported (${snapA.hydrationMode})`);

  const b = await open();
  console.log('  connected (b)');
  await next(b, (m) => m.type === 'control-snapshot');

  // 2. Committed mapping fan-out — B writes, the ack returns to B, A sees the
  // broadcast (the sender ack and the fan-out echo are different frames).
  const source = `ui:control-smoke-${Date.now() % 1000}`;
  const destination = 'synth:param-smoke';
  b.send(mappingSet(source, destination, 0.5));
  const commitB = await next(b, (m) => m.type === 'control-ack' && m.valid);
  ok(commitB && commitB.kind === 'control.mapping.set', 'committed mapping.set acked to the sender');
  const echoed = await next(a, (m) => m.type === 'control.mapping.set' && m.source === source);
  ok(echoed && echoed.destination === destination, 'mapping broadcast to the other client');

  // 3. Ephemeral fan-out — source → destination.
  a.send(JSON.stringify({ type: 'control', source, value: 0.7 }));
  const fan = await next(b, (m) => m.type === 'control' && m.source === source);
  ok(fan && fan.destination === destination && fan.value === 0.7, 'ephemeral move routes to the destination');

  // 4. Backpressure — blast well past 60Hz; expect at least one drop event.
  let drops = 0;
  b.on('message', (data) => {
    try { const m = JSON.parse(data.toString()); if (m.type === 'backpressure') drops++; } catch {}
  });
  const burst = 200;
  for (let i = 0; i < burst; i++) a.send(JSON.stringify({ type: 'control', source, value: i / burst }));
  await sleep(800);
  ok(drops > 0, `backpressure drop emitted at 60Hz+ burst (${drops} drops)`);

  // 5. Hibernation wake — idle, then a move still fans out (DO slept and woke).
  console.log('  idling 30s to allow hibernation...');
  await sleep(30000);
  a.send(JSON.stringify({ type: 'control', source, value: 0.42 }));
  const woke = await next(b, (m) => m.type === 'control' && m.source === source && m.value === 0.42);
  ok(Boolean(woke), 'post-hibernation wake: move fans out after the DO slept');

  // 5b. Hibernation restoration mode — after the idle window the DO woke from
  // the durable checkpoint (a local storage get), not a cold-start D1 scan.
  // Reported informatively; the fan-out above is the hard correctness check.
  const d = await open();
  const snapD = await next(d, (m) => m.type === 'control-snapshot');
  if (snapD && snapD.hydrationMode) {
    console.log(`  hydrationMode on wake: ${snapD.hydrationMode}`);
  }
  d.close();

  // 6. Committed state survives — a fresh client's snapshot still has it.
  const c = await open();
  const snapC = await next(c, (m) => m.type === 'control-snapshot');
  ok(snapC.mappings.some((m) => m.source === source), 'fresh client snapshot sees the committed mapping');

  a.close(); b.close(); c.close();
  console.log(failures === 0 ? '\n✅ ControlRoom smoke passed.' : `\n❌ ControlRoom smoke FAILED — ${failures} failure(s).`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(`\n❌ ControlRoom smoke errored: ${String(e)}`);
  process.exit(1);
});