#!/usr/bin/env node
/**
 * scripts/verify-mcp-conformance.mjs — fleet MCP conformance gate (2026-07-28 stateless contract).
 *
 * Plain node, zero dependencies. Reads the curated P31 catalog straight from
 * the registry source (workers/mcp-registry/src/index.ts — OFFICIAL_CATALOG),
 * then asserts four conformance properties per remote server:
 *
 *   (a) server/discover returns protocolVersion + supportedProtocolVersions +
 *       serverInfo under the full stateless contract (SEP-2243 Mcp-* headers,
 *       MCP-Protocol-Version: 2026-07-28, params._meta envelope).
 *   (b) tools/list returns resultType "complete".
 *   (c) a removed method (ping) returns a proper JSON-RPC error object
 *       (-32601/-32602/not-found — never a crash or a silent 200 result).
 *   (d) a request WITHOUT the Mcp-Method header fails cleanly (-32020 or
 *       similar). A server that silently succeeds without headers is a
 *       conformance gap.
 *
 * Emits a per-server table and exits 1 when any server has a gap.
 * Usage: node scripts/verify-mcp-conformance.mjs [--json]
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_SRC = resolve(__dirname, '../workers/mcp-registry/src/index.ts');

const PROTOCOL_VERSION = '2026-07-28';
const CLIENT_INFO = { name: 'p31-conformance-check', version: '1.0.0' };
const CHECK_TIMEOUT_MS = 8000;
const CONCURRENCY = 5;

// ─── Catalog extraction (reads the registry source of truth) ───────────────

/** Slice OFFICIAL_CATALOG out of the TS source and parse its entries. */
function readOfficialCatalog() {
  const src = readFileSync(CATALOG_SRC, 'utf8');
  const startMarker = 'const OFFICIAL_CATALOG: McpServerEntry[] = [';
  const start = src.indexOf(startMarker);
  if (start === -1) throw new Error(`OFFICIAL_CATALOG not found in ${CATALOG_SRC}`);
  const blockStart = start + startMarker.length;
  const end = src.indexOf('\n];', blockStart);
  if (end === -1) throw new Error('OFFICIAL_CATALOG closing bracket not found');
  const block = src.slice(blockStart, end);

  const entries = [];
  // Each entry begins with a two-space-indented `{` on its own line.
  for (const chunk of block.split(/\n  \{(?=\n)/)) {
    const pick = (re) => {
      const m = re.exec(chunk);
      return m ? m[1] : undefined;
    };
    const id = pick(/id:\s*'([^']+)'/);
    if (!id) continue; // prelude comment lines before the first entry
    entries.push({
      id,
      name: pick(/name:\s*'([^']+)'/) ?? id,
      endpoint: pick(/endpoint:\s*'([^']+)'/),
      kind: pick(/kind:\s*'([^']+)'/),
      protocol: pick(/protocol:\s*'([^']+)'/),
    });
  }
  // Non-MCP connectors (relabeled, kept visible in the catalog) are excluded
  // from MCP conformance assertions — same precedent as the
  // federation-bridge/ledger-bridge relabel: `protocol: 'n/a — not an MCP
  // server'`. Mirrors the existing kind/endpoint filter on the next line.
  return entries.filter((e) => e.kind === 'remote' && e.endpoint?.startsWith('http') && !e.protocol?.startsWith('n/a'));
}

// ─── Transport ──────────────────────────────────────────────────────────────

/** Parse an MCP endpoint response: single JSON body or SSE `data:` frames. */
function parseMcpBody(text) {
  const strip = (s) =>
    s.replace(/^event:\s*[^\n]*\n?/gm, '').replace(/^data:\s*/gm, '').trim();
  const stripped = strip(text);
  if (stripped.startsWith('{')) {
    try { return JSON.parse(stripped); } catch { /* fall through */ }
  }
  const frames = text.split('\n\n').map(strip).filter(Boolean);
  for (let i = frames.length - 1; i >= 0; i--) {
    try { return JSON.parse(frames[i]); } catch { /* skip */ }
  }
  try { return JSON.parse(text); } catch { return null; }
}

function statelessBody(method, id) {
  return {
    jsonrpc: '2.0',
    id,
    method,
    params: {
      _meta: {
        'io.modelcontextprotocol/protocolVersion': PROTOCOL_VERSION,
        'io.modelcontextprotocol/clientInfo': CLIENT_INFO,
        'io.modelcontextprotocol/clientCapabilities': {},
      },
    },
  };
}

const BASE_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
};

async function post(entry, method, id, opts = {}) {
  const headers = {
    ...BASE_HEADERS,
    ...(opts.headers ?? {}),
  };
  const res = await fetch(entry.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(opts.body ?? statelessBody(method, id)),
    signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
  });
  const text = await res.text();
  return { status: res.status, body: parseMcpBody(text) };
}

function sepHeaders(method, name) {
  return {
    'Mcp-Method': method,
    'Mcp-Name': name ?? 'p31-conformance-check',
    'MCP-Protocol-Version': PROTOCOL_VERSION,
  };
}

// ─── Checks ─────────────────────────────────────────────────────────────────

async function checkDiscover(entry) {
  try {
    const { status, body } = await post(entry, 'server/discover', 1, { headers: sepHeaders('server/discover', entry.name) });
    const result = body?.result ?? {};
    const protocolVersion =
      result.protocolVersion ?? result._meta?.['io.modelcontextprotocol/protocolVersion'];
    const supported = result.supportedProtocolVersions ?? result.supportedVersions;
    const serverInfo = result.serverInfo ?? result._meta?.['io.modelcontextprotocol/serverInfo'];
    if (body?.error && !protocolVersion) {
      const msg = String(body.error.message ?? '').slice(0, 140);
      return { ok: false, detail: `rejected: ${body.error.code ?? '?'} ${msg}` };
    }
    const missing = [];
    if (!protocolVersion) missing.push('protocolVersion');
    if (!Array.isArray(supported) || supported.length === 0) missing.push('supportedProtocolVersions');
    if (!serverInfo) missing.push('serverInfo');
    return { ok: missing.length === 0, detail: missing.length ? `missing ${missing.join(', ')} (http ${status})` : undefined };
  } catch (e) {
    return { ok: false, detail: `probe error: ${String(e?.message ?? e).slice(0, 120)}` };
  }
}

async function checkResultType(entry) {
  try {
    const { body } = await post(entry, 'tools/list', 2, { headers: sepHeaders('tools/list', entry.name) });
    const result = body?.result;
    if (result && typeof result === 'object' && result.resultType === 'complete') return { ok: true };
    return { ok: false, detail: `resultType=${result?.resultType ?? '<absent>'}` };
  } catch (e) {
    return { ok: false, detail: `probe error: ${String(e?.message ?? e).slice(0, 120)}` };
  }
}

async function checkRemovedMethod(entry) {
  try {
    const { status, body } = await post(entry, 'ping', 3, { headers: sepHeaders('ping', entry.name) });
    const err = body?.error;
    if (err && typeof err === 'object') return { ok: true, detail: `error code ${err.code ?? '?'}` };
    if (status >= 400) return { ok: true, detail: `http ${status}` };
    return { ok: false, detail: `no JSON-RPC error (http ${status}, ${body?.result ? 'result returned' : 'empty body'})` };
  } catch (e) {
    return { ok: false, detail: `probe error: ${String(e?.message ?? e).slice(0, 120)}` };
  }
}

async function checkHeaderEnforced(entry) {
  try {
    // No Mcp-Method / Mcp-Name / MCP-Protocol-Version headers at all.
    const { status, body } = await post(entry, 'server/discover', 4, { headers: {} });
    if (body?.error && typeof body.error === 'object') return { ok: true, detail: `error code ${body.error.code ?? '?'}` };
    if (status >= 400) return { ok: true, detail: `http ${status}` };
    if (body?.result) return { ok: false, detail: `succeeded without Mcp-Method header (http ${status})` };
    return { ok: true, detail: 'no result, no error — treated as clean failure' };
  } catch (e) {
    return { ok: false, detail: `probe error: ${String(e?.message ?? e).slice(0, 120)}` };
  }
}

// ─── Runner ─────────────────────────────────────────────────────────────────

async function checkServer(entry) {
  const [discover, resultType, removedMethod, headerEnforced] = await Promise.all([
    checkDiscover(entry),
    checkResultType(entry),
    checkRemovedMethod(entry),
    checkHeaderEnforced(entry),
  ]);
  return {
    id: entry.id,
    name: entry.name,
    endpoint: entry.endpoint,
    discover: discover.ok,
    resultType: resultType.ok,
    removedMethod: removedMethod.ok,
    headerEnforced: headerEnforced.ok,
    details: [discover.detail, resultType.detail, removedMethod.detail, headerEnforced.detail]
      .filter(Boolean),
    gaps: [
      !discover.ok ? 'discover' : null,
      !resultType.ok ? 'resultType' : null,
      !removedMethod.ok ? 'removedMethod' : null,
      !headerEnforced.ok ? 'headerEnforced' : null,
    ].filter(Boolean),
  };
}

async function run() {
  const entries = readOfficialCatalog();
  console.error(`Catalog: ${entries.length} remote servers from ${CATALOG_SRC}\n`);

  const results = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, entries.length) }, async () => {
    while (cursor < entries.length) {
      const entry = entries[cursor++];
      results.push(await checkServer(entry));
    }
  });
  await Promise.all(workers);
  results.sort((a, b) => a.id.localeCompare(b.id));

  // ─── Table ───
  const col = (s, w) => String(s).padEnd(w);
  const rows = [
    col('SERVER', 20) + col('DISCOVER', 10) + col('RESULT-TYPE', 12) +
    col('REMOVED-METHOD', 15) + col('HEADER-ENFORCED', 16) + 'GAPS',
  ];
  for (const r of results) {
    rows.push(
      col(r.id, 20) +
      col(r.discover ? 'ok' : 'FAIL', 10) +
      col(r.resultType ? 'ok' : 'FAIL', 12) +
      col(r.removedMethod ? 'ok' : 'FAIL', 15) +
      col(r.headerEnforced ? 'ok' : 'FAIL', 16) +
      (r.gaps.length ? r.gaps.join(', ') : ''),
    );
  }
  console.log(rows.join('\n'));

  const failed = results.filter((r) => r.gaps.length > 0);
  if (failed.length > 0) {
    console.error('\n── Gap details ──');
    for (const r of failed) {
      for (const d of r.details) console.error(`  ${r.id}: ${d}`);
    }
  }

  const summary = {
    total: results.length,
    conformant: results.length - failed.length,
    gaps: failed.length,
    servers: results.map((r) => ({
      id: r.id,
      discover: r.discover,
      resultType: r.resultType,
      removedMethod: r.removedMethod,
      headerEnforced: r.headerEnforced,
      gaps: r.gaps,
      details: r.details,
    })),
  };
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(summary, null, 2));
  }

  console.error(
    `\nmcp-conformance: ${summary.conformant}/${summary.total} fully conformant` +
    (failed.length ? ` — ${failed.length} server(s) with gaps` : ''),
  );
  process.exit(failed.length ? 1 : 0);
}

run().catch((e) => {
  console.error(`mcp-conformance crashed: ${e?.stack ?? e}`);
  process.exit(2);
});