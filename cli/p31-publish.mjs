#!/usr/bin/env node
// p31 publish — probe a deployed P31 MCP worker (or any Streamable-HTTP MCP
// URL) and emit a `.p31-mcp.json` manifest; optionally submit it to the P31
// registry (POST /servers). Plain node, zero deps.
//
//   node cli/p31-publish.mjs <worker-dir> | <url> [-n name] [-o out.json]
//       [-c category[,category...]] [-submit]
//
// Worker dir: reads package.json + wrangler.toml, derives the deployed URL
// (wrangler.toml route/routes or `https://<name>.trimtab-signal.workers.dev/mcp`),
// probes with the stateless 2026-07-28 handshake (server/discover + tools/list;
// falls back to the 2025-era initialize handshake for legacy servers).
// URL: probes directly, same negotiation.
//
// Manifest shape (runbook §4 D-2):
//   { name, description, url, protocol,
//     tools: [ { name, description, inputSchema } ],
//     oauth: { enabled, resource }, categories: [] }
//
// -submit posts the registry RegisterPayload {id,name,endpoint,category,
// description,tags,author} to POST /servers (community-open). If the registry
// ever requires auth, P31_PUBLISH_TOKEN is sent as `Authorization: Bearer`.
// Registry base: env P31_REGISTRY, default
// https://mcp-registry.trimtab-signal.workers.dev
import { readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REGISTRY_BASE = process.env.P31_REGISTRY ?? 'https://mcp-registry.trimtab-signal.workers.dev';
const MODERN = '2026-07-28';
const LEGACY = '2025-11-25';
const CLIENT_INFO = { name: 'p31-publish', version: '1.0.0' };
const TIMEOUT_MS = 8000;
const VERSION = '1.0.0';

// ── tiny argv parser ─────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { target: null, name: null, out: null, categories: [], submit: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') args.help = true;
    else if (a === '-n' || a === '--name') args.name = argv[++i];
    else if (a === '-o' || a === '--out') args.out = argv[++i];
    else if (a === '-c' || a === '--category') args.categories = String(argv[++i] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '-submit' || a === '--submit') args.submit = true;
    else if (a.startsWith('-') && a !== '-') fail(`unknown flag: ${a}`);
    else if (args.target === null) args.target = a;
    else fail(`unexpected extra argument: ${a}`);
  }
  return args;
}

function fail(message) {
  console.error(`p31-publish: ${message}`);
  process.exit(1);
}

function usage() {
  console.log(`p31 publish ${VERSION} — probe an MCP server, emit a .p31-mcp.json manifest

usage: node cli/p31-publish.mjs <worker-dir> | <url> [options]

options:
  -n, --name <name>       override the manifest name
  -o, --out <file>        write the manifest to <file> (default: .p31-mcp.json)
  -c, --category <cats>   comma-separated categories (default: [])
  -submit, --submit       POST the manifest to the registry (POST /servers)
  -h, --help              this help

env:
  P31_REGISTRY            registry base URL (default ${REGISTRY_BASE})
  P31_PUBLISH_TOKEN       bearer token for registry submission, if it requires auth`);
}

// ── probe layer (MCP Streamable HTTP, no SDK) ────────────────────────────
async function postJson(url, body, headers = {}, signal) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers },
    body: JSON.stringify(body),
    signal,
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text, body: parseMcpResponse(text) };
}

/** Parse a plain JSON body or an SSE stream (`event: message` + `data:` lines). */
function parseMcpResponse(text) {
  if (!text || !text.trim()) return null;
  if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try { return JSON.parse(text); } catch { return null; }
  }
  const chunks = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('data:')) {
      try { chunks.push(JSON.parse(line.slice(5).trim())); } catch { /* non-JSON SSE line */ }
    }
  }
  return chunks.at(-1) ?? null;
}

function modernEnvelope(method, extraParams = {}) {
  return {
    jsonrpc: '2.0',
    id: Math.floor(Math.random() * 1e9),
    method,
    params: {
      _meta: {
        'io.modelcontextprotocol/protocolVersion': MODERN,
        'io.modelcontextprotocol/clientCapabilities': {},
        'io.modelcontextprotocol/clientInfo': CLIENT_INFO,
      },
      ...extraParams,
    },
  };
}

/** Stateless 2026-07-28 probe: server/discover then tools/list. */
async function probeModern(url) {
  const headers = { 'MCP-Protocol-Version': MODERN, 'Mcp-Method': 'server/discover' };
  const discover = await postJson(url, modernEnvelope('server/discover'), headers, AbortSignal.timeout(TIMEOUT_MS));
  if (discover.body?.error || !discover.body?.result) return null;
  const dResult = discover.body.result;
  const list = await postJson(url, modernEnvelope('tools/list'), { 'MCP-Protocol-Version': MODERN, 'Mcp-Method': 'tools/list' }, AbortSignal.timeout(TIMEOUT_MS));
  if (list.body?.error || !list.body?.result) return null;
  const tools = Array.isArray(list.body.result.tools) ? list.body.result.tools : [];
  const protocol = Array.isArray(dResult.supportedVersions) && dResult.supportedVersions.length
    ? dResult.supportedVersions[0]
    : dResult.protocolVersion ?? MODERN;
  const serverInfo = dResult.serverInfo ?? dResult._meta?.['io.modelcontextprotocol/serverInfo'] ?? null;
  return { protocol, serverInfo, tools };
}

/** Legacy 2025-era probe: initialize (+ initialized) then tools/list. */
async function probeLegacy(url) {
  const init = await postJson(url, {
    jsonrpc: '2.0',
    id: Math.floor(Math.random() * 1e9),
    method: 'initialize',
    params: { protocolVersion: LEGACY, capabilities: {}, clientInfo: CLIENT_INFO },
  }, {}, AbortSignal.timeout(TIMEOUT_MS));
  if (init.body?.error || !init.body?.result) return null;
  const session = init.headers.get('mcp-session-id');
  const headers = session ? { 'Mcp-Session-Id': session } : {};
  // Complete the 2025-era handshake; some servers refuse tools/list otherwise.
  await postJson(url, { jsonrpc: '2.0', method: 'notifications/initialized' }, headers, AbortSignal.timeout(TIMEOUT_MS)).catch(() => {});
  const list = await postJson(url, { jsonrpc: '2.0', id: Math.floor(Math.random() * 1e9), method: 'tools/list', params: {} }, headers, AbortSignal.timeout(TIMEOUT_MS));
  if (list.body?.error || !list.body?.result) return null;
  const tools = Array.isArray(list.body.result.tools) ? list.body.result.tools : [];
  return {
    protocol: init.body.result.protocolVersion ?? LEGACY,
    serverInfo: init.body.result.serverInfo ?? null,
    tools,
  };
}

async function probe(url) {
  // Retry a bare origin (or non-/mcp path that 404s) at /mcp once.
  let modern = null;
  let legacy = null;
  const candidates = [url];
  try {
    const first = new URL(url);
    if (first.pathname !== '/mcp') candidates.push(first.origin + '/mcp');
  } catch { /* url validity checked earlier */ }
  for (const candidate of candidates) {
    try {
      modern = await probeModern(candidate);
    } catch { modern = null; }
    if (modern) return { url: candidate, ...modern };
    try {
      legacy = await probeLegacy(candidate);
    } catch { legacy = null; }
    if (legacy) return { url: candidate, ...legacy };
  }
  return null;
}

// ── worker-dir resolution ────────────────────────────────────────────────
function parseWrangler(text) {
  const out = { name: null, route: null, resource: null, oauthJwks: null };
  const name = /^\s*name\s*=\s*"([^"]+)"/m.exec(text);
  if (name) out.name = name[1];
  const route = /^\s*route\s*=\s*"([^"]+)"/m.exec(text);
  const routes = /^\s*routes\s*=\s*\[\s*(?:{[^}]*?pattern\s*=\s*"([^"]+)"[^}]*}|\s*"([^"]+)"\s*,?\s*)*\]/m.exec(text);
  if (route) out.route = route[1];
  else if (routes) out.route = routes[1] ?? routes[2];
  const resource = /^\s*RESOURCE_ID\s*=\s*"([^"]+)"/m.exec(text);
  if (resource) out.resource = resource[1];
  const jwks = /^\s*OAUTH_JWKS_URL\s*=\s*"([^"]+)"/m.exec(text);
  if (jwks) out.oauthJwks = jwks[1];
  return out;
}

function deployUrl(wrangler, name) {
  if (wrangler.route) {
    const host = wrangler.route.replace(/^https?:\/\//, '').replace(/\/\*?$/, '').replace(/\/.*$/, '');
    return `https://${host}/mcp`;
  }
  return `https://${name}.trimtab-signal.workers.dev/mcp`;
}

async function readJsonFile(path) {
  try {
    const text = await readFile(path, 'utf8');
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function resolveFromDir(dir) {
  const pkg = await readJsonFile(resolve(dir, 'package.json'));
  const wrRaw = await readFile(resolve(dir, 'wrangler.toml'), 'utf8').catch(() => null);
  const wr = wrRaw ? parseWrangler(wrRaw) : { name: null, route: null, resource: null, oauthJwks: null };
  const name = wr.name ?? pkg?.name?.replace(/^@[^/]+\//, '') ?? null;
  if (!name) fail(`could not determine a worker name from ${dir} (no wrangler.toml name, no package.json name)`);
  const url = deployUrl(wr, name);
  return {
    dir,
    name,
    url,
    description: pkg?.description ?? null,
    oauth: { enabled: Boolean(wr.oauthJwks), resource: wr.resource ?? url },
  };
}

async function resolveFromUrl(url) {
  let parsed;
  try { parsed = new URL(url); } catch { fail(`invalid URL: ${url}`); }
  if (!/^https?:$/.test(parsed.protocol)) fail(`only http(s) URLs are supported, got: ${url}`);
  const oauth = { enabled: false, resource: null };
  try {
    const wk = await fetch(`${parsed.origin}/.well-known/oauth-authorization-server`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (wk.ok) {
      const meta = await wk.json().catch(() => null);
      if (meta && typeof meta === 'object') {
        oauth.enabled = true;
        oauth.resource = meta.resource ?? meta.resource_metadata?.resource ?? null;
      }
    }
  } catch { /* well-known probe is best-effort */ }
  return { dir: null, name: null, url, description: null, oauth };
}

// ── manifest construction ────────────────────────────────────────────────
function buildManifest({ name, description, url, protocol, serverInfo, tools, oauth, categories }) {
  return {
    name,
    description: description ?? serverInfo?.name ?? name,
    url,
    protocol,
    tools: tools.map((t) => ({
      name: String(t.name ?? ''),
      description: String(t.description ?? ''),
      inputSchema: t.inputSchema ?? {},
    })).filter((t) => t.name),
    oauth: { enabled: Boolean(oauth?.enabled), resource: oauth?.resource ?? null },
    categories: Array.isArray(categories) ? categories : [],
  };
}

function slug(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
}

// ── main ─────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.target) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  const looksUrl = /^https?:\/\//i.test(args.target);
  const source = looksUrl ? await resolveFromUrl(args.target) : await resolveFromDir(args.target);

  const probed = await probe(source.url);
  if (!probed) fail(`probe failed: ${source.url} did not answer server/discover (2026-07-28) or the legacy initialize handshake with a tools/list`);
  const finalUrl = probed.url;

  // Name precedence: -n override → worker-dir name → advertised serverInfo.
  const manifestName = args.name !== null ? args.name : (source.name ?? probed.serverInfo?.name ?? null);

  const manifest = buildManifest({
    name: manifestName,
    description: source.description,
    url: finalUrl,
    protocol: probed.protocol,
    serverInfo: probed.serverInfo,
    tools: probed.tools,
    oauth: source.oauth,
    categories: args.categories,
  });
  // Negative control: a manifest without a name must be rejected loudly.
  if (!manifest.name) fail('invalid manifest: `name` is required and must be a non-empty string (pass -n <name>)');

  const outPath = args.out ?? (source.dir ? resolve(source.dir, '.p31-mcp.json') : resolve(HERE, '.p31-mcp.json'));
  await writeFile(outPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`p31-publish: probed ${finalUrl} (${manifest.protocol}) — ${manifest.tools.length} tools`);
  console.log(`p31-publish: wrote ${outPath}`);

  if (args.submit) {
    const category = manifest.categories[0] ?? 'infra';
    const payload = {
      id: slug(manifest.name),
      name: manifest.name,
      endpoint: finalUrl,
      category,
      description: manifest.description,
      tags: [],
      author: 'p31-publish',
      capabilities: {
        tools: manifest.tools.map((t) => t.name),
        dataSources: [],
        externalServices: [],
        writeCapable: false,
      },
    };
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.P31_PUBLISH_TOKEN) headers.Authorization = `Bearer ${process.env.P31_PUBLISH_TOKEN}`;
    try {
      const res = await fetch(`${REGISTRY_BASE}/servers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) fail(`registry submission failed: HTTP ${res.status} — ${data?.error ?? 'unknown error'}`);
      console.log(`p31-publish: registered as ${payload.id} (status: ${data?.status ?? 'registered'})`);
    } catch (e) {
      fail(`registry submission failed: ${e?.name === 'TimeoutError' ? 'timeout' : e?.message ?? e}`);
    }
  }
}

main().catch((e) => {
  console.error(`p31-publish: unexpected error: ${e?.message ?? e}`);
  process.exit(1);
});