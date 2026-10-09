#!/usr/bin/env node
/**
 * negative-controls/layout-invariants.mjs — the layout gate's negative control.
 *
 * Serves a deliberately-broken fixture (the 960px-topbar class of bug: a topbar
 * that does not span the viewport, plus an in-flow child overflowing its
 * container) and asserts layout-invariants exits NON-ZERO against it.
 *
 * A gate that cannot go red is furniture (§7.3). If this NC exits 0, the gate
 * is broken and the deploy pipeline must refuse to proceed.
 */
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const GATE = '/home/p31/production/tools/design-parity/layout-invariants.mjs';

const FIXTURE = `<!doctype html>
<html><head><style>
  body { margin: 0; }
  /* The exact bug class this gate exists to catch: a topbar that does NOT
     span the viewport width (was: 960px in a 1440px viewport). */
  .topbar { position: sticky; top: 0; width: 600px; height: 56px; background: #333; }
  .app-main { width: 1200px; margin: 0 auto; }
  /* In-flow child overflowing its container — must be caught. */
  .wide { width: 1400px; }
</style></head><body>
  <div class="topbar">clipped</div>
  <main class="app-main"><div class="wide">overflowing in-flow child</div></main>
</body></html>`;

const server = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html', 'content-length': Buffer.byteLength(FIXTURE) });
  res.end(FIXTURE);
});

server.listen(0, '127.0.0.1', () => {
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}`;
  try {
    execFileSync('node', [GATE, url], { stdio: 'inherit' });
    // Gate exited 0 against a known-broken layout → the gate is furniture.
    console.error(`\nNEGATIVE_CONTROL_FAIL: layout-invariants passed against a broken fixture (${url}) — the gate cannot fail.`);
    process.exitCode = 1;
  } catch (e) {
    console.log(`\nNEGATIVE_CONTROL_OK: layout-invariants failed on the broken fixture (${url}) as expected.`);
    process.exitCode = 0;
  } finally {
    server.close();
  }
});