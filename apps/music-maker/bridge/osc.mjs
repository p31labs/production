#!/usr/bin/env node
/**
 * P31 OSC sidecar.
 *
 * OSC/UDP cannot run in a Cloudflare Worker (no raw UDP sockets). This is the
 * user-run companion: it subscribes to the ControlRoom's /control/osc WS and
 * re-emits every control move as an OSC message over UDP.
 *
 *   node bridge/osc.mjs --room wss://music-presence.trimtab-signal.workers.dev/control/osc \
 *                       --host 127.0.0.1 --port 9000
 *
 * Uses osc-js's DatagramPlugin for UDP send — the researched shape for a Node
 * bridge between a WebSocket and UDP peers. The BridgePlugin form is for a
 * full duplex bridge; this MVP is outbound-only, so the plain DatagramPlugin
 * send side is enough.
 *
 * Requires: npm i osc-js  (a Node companion, not a Worker dependency).
 *
 * Outbound only for the MVP: a control move in the browser becomes an OSC
 * message on the LAN. Inbound OSC is a later unlock.
 */

import { parseArgs } from 'node:util';
import OSC from 'osc-js';

const { values } = parseArgs({
  options: {
    room: { type: 'string', default: 'ws://localhost:8787/control/osc' },
    host: { type: 'string', default: '127.0.0.1' },
    port: { type: 'string', default: '9000' },
    verbose: { type: 'boolean', default: false },
  },
});

const { room, host, verbose } = values;
const port = Number(values.port);

// The osc-js instance sends via UDP to the target host:port.
const osc = new OSC({ plugin: new OSC.DatagramPlugin({ send: { host, port } }) });
osc.open();

const log = (...a) => console.log('[osc-bridge]', ...a);

function connect() {
  log(`connecting to ${room}`);
  const ws = new WebSocket(room);

  ws.addEventListener('open', () => log('connected'));
  ws.addEventListener('message', (ev) => {
    let msg;
    try {
      msg = JSON.parse(String(ev.data));
    } catch {
      return;
    }
    // The DO sends { type:'control', source, destination, value, ts } for
    // every routed move. Re-emit as /p31/<destination> <value>.
    if (msg.type !== 'control') return;
    const path = `/p31/${String(msg.destination).replace(/[^a-zA-Z0-9/.-]/g, '_')}`;
    const message = new OSC.Message(path, Number(msg.value));
    osc.send(message);
    if (verbose) log(`→ ${path} ${msg.value}`);
  });
  ws.addEventListener('close', () => {
    log('disconnected — reconnecting in 3s');
    setTimeout(connect, 3000);
  });
  ws.addEventListener('error', (e) => log('ws error', String(e?.message ?? e)));
}

connect();
log(`OSC out → udp://${host}:${port}`);
log('press Ctrl-C to stop');