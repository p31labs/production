#!/usr/bin/env node
/**
 * Negative controls for the local design MCP server (cli/design-mcp-server.js).
 *
 * Proves the three governance tools fail closed:
 *   - validate_output   refuses hardcoded hex (valid:false)
 *   - scaffold_component refuses an unknown component (status:error)
 *   - propose_page      refuses an unknown component (valid:false)
 *
 * Spawns the server over its real stdio transport, so the refusal is asserted
 * on the live surface, not a re-implemented one. Runs with P31_NO_LEDGER=1 so
 * the test does not write tool-call entries into the production ledger.
 *
 * Usage: node cli/design-mcp-server.test.js
 * Exit 0 when all refusals fire; exit 1 otherwise.
 */
const { spawn } = require('child_process');
const path = require('path');

const SERVER = path.join(__dirname, 'design-mcp-server.js');

const child = spawn('node', [SERVER], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: { ...process.env, P31_NO_LEDGER: '1' },
});

let buffer = '';
let nextId = 0;
const pending = new Map();

child.stdout.on('data', (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let msg;
    try { msg = JSON.parse(trimmed); } catch { continue; }
    if (msg.id !== undefined && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});

function rpc(method, params) {
  return new Promise((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

function toolResult(msg) {
  try {
    const content = msg.result && msg.result.content;
    if (Array.isArray(content) && content[0] && content[0].text) return JSON.parse(content[0].text);
    return msg.result;
  } catch {
    return null;
  }
}

let pass = 0;
let fail = 0;
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${detail}`); }
}

(async () => {
  console.log('design-mcp-server negative controls — proving the governance tools fail closed\n');

  await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'negctrl', version: '0' } });

  // 1. validate_output refuses hardcoded hex.
  let m = await rpc('tools/call', { name: 'validate_output', arguments: { code: 'const c = "#ffffff";' } });
  let r = toolResult(m);
  check('validate_output refuses hardcoded hex', !!(r && r.valid === false && (r.violations || []).some((v) => v.startsWith('hardcoded_hex'))));

  // 2. scaffold_component refuses an unknown component.
  m = await rpc('tools/call', { name: 'scaffold_component', arguments: { name: 'Nope' } });
  r = toolResult(m);
  check('scaffold_component refuses unknown component', !!(r && r.status === 'error'));

  // 3. propose_page refuses an unknown component.
  m = await rpc('tools/call', { name: 'propose_page', arguments: { type: 'card-grid', components: ['GlassCard', 'Nope'] } });
  r = toolResult(m);
  check('propose_page refuses unknown component', !!(r && r.valid === false));

  // 4. validate_output passes clean token-based output (the positive control).
  m = await rpc('tools/call', { name: 'validate_output', arguments: { code: 'const c = "var(--p31-accent)";' } });
  r = toolResult(m);
  check('validate_output passes clean output', !!(r && r.valid === true));

  // 5. scaffold_component scaffolds a known component (positive control).
  m = await rpc('tools/call', { name: 'scaffold_component', arguments: { name: 'Button' } });
  r = toolResult(m);
  check('scaffold_component scaffolds a known component', !!(r && r.status === 'ok' && r.scaffold && r.scaffold.tsx));

  console.log(`\n${pass} passed, ${fail} failed`);
  child.stdin.end();
  child.kill();
  process.exit(fail > 0 ? 1 : 0);
})();