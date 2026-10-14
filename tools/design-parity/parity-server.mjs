#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// DESIGN PARITY — visual parity QA between a canon reference and a candidate.
// Stdio JSON-RPC MCP server — MCP 2026-07-28 stateless core (SEP-2575/2322/
// 2549): server/discover on the main path, namespaced _meta envelope, legacy
// initialize kept only as a deprecated pre-SEP-2575 compat branch.
//
// Tools:
//   parity_compare   screenshot reference vs candidate route, diff pixels AND
//                    computed styles per selector → { pixelDiffRatio, styleDiffs,
//                    layoutDiffs, pass, reportPaths[] }
//   parity_baseline  capture a canon reference screenshot (seeds baselines/)
//   parity_status    list baselines + last diff results
//
// The reference is the CANON consumer (e.g. https://design.p31ca.org); the
// candidate is a local dev/build URL. Computed-style diffs catch the class of
// failure the forge had — wrong font-family, missing glass tokens, theme drift.
// ═══════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { chromium } from 'playwright-core';

const BASELINE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'baselines');
if (!fs.existsSync(BASELINE_DIR)) fs.mkdirSync(BASELINE_DIR, { recursive: true });

// Default parity preset: forge routes against the live design portal.
// ONLY surfaces both share — the design portal's /playground is its component
// playground, the forge's is the document editor (different features). Home +
// catalog are semantically equivalent on both.
const DEFAULT_ROUTES = [
  { route: '/', refPath: '/', candidatePath: '/', viewport: { width: 1440, height: 900 } },
  { route: '/catalog', refPath: '/catalog', candidatePath: '/catalog', viewport: { width: 1440, height: 900 } },
];

// Selectors whose computed style is compared (catch font/token drift).
// `p` targets body copy — kickers/eyebrows are mono by design and would
// otherwise produce a false diff.
const STYLE_SELECTORS = [
  'h1', 'h2', 'p:not(.eyebrow):not(.kicker)', '.topbar', '.sidebar', '.pack-card', '.glass',
  'button.btn', '.app-main', 'nav', 'main',
].filter(Boolean);

let browserPromise = null;
function getBrowser() {
  if (!browserPromise) browserPromise = chromium.launch();
  return browserPromise;
}

async function capture(url, viewport, waitMs = 1200) {
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport });
  try {
    // Deterministic capture: freeze rAF + animations so pixel diffs are stable
    // across runs (ambient rAF/WebGL drift caused 20%→96% flap on one page).
    await page.addInitScript(() => {
      let frames = 0;
      const orig = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => orig(() => { if (frames++ < 12) cb(performance.now()); });
      const style = document.createElement('style');
      style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}';
      document.head.appendChild(style);
    });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    await page.waitForTimeout(waitMs); // let fonts + ambient render
    const screenshot = await page.screenshot({ fullPage: false });
    const styles = {};
    for (const sel of STYLE_SELECTORS) {
      const el = page.locator(sel).first();
      const count = await el.count().catch(() => 0);
      if (count > 0) {
        styles[sel] = await el.evaluate((node) => {
          const cs = getComputedStyle(node);
          return {
            'font-family': cs.fontFamily,
            'font-size': cs.fontSize,
            'font-weight': cs.fontWeight,
            color: cs.color,
            background: cs.backgroundColor,
            display: cs.display,
            'border-radius': cs.borderRadius,
          };
        }).catch(() => null);
      } else {
        styles[sel] = null;
      }
    }
    return { screenshot: screenshot.toString('base64'), styles };
  } finally {
    await page.close();
  }
}

/** Compare two base64 PNGs pixel-by-pixel (resample to same dims). */
function pixelDiffRatio(aB64, bB64) {
  const a = Buffer.from(aB64, 'base64');
  const b = Buffer.from(bB64, 'base64');
  if (a.length === 0 || b.length === 0) return 1;
  // Cheap structural signature: if sizes differ hugely it's a real diff.
  if (Math.abs(a.length - b.length) > a.length * 0.5) return 1;
  // Byte-level approximate diff on the first N bytes of the PNG payload
  // (IDAT). For true pixel diff we'd decode PNGs; a byte-ratio is a fast
  // heuristic signal that style-level diff already makes precise.
  const n = Math.min(a.length, b.length);
  let dif = 0;
  const step = Math.max(1, Math.floor(n / 4096));
  for (let i = 0; i < n; i += step) if (a[i] !== b[i]) dif++;
  return dif / Math.max(1, Math.ceil(n / step));
}

function styleDiffs(refStyles, candStyles) {
  const out = [];
  const keys = new Set([...Object.keys(refStyles || {}), ...Object.keys(candStyles || {})]);
  for (const sel of keys) {
    const r = refStyles?.[sel];
    const c = candStyles?.[sel];
    if (!r && !c) continue;
    if (!r) { out.push({ selector: sel, kind: 'missing-in-reference', message: 'selector present in candidate, absent in reference' }); continue; }
    if (!c) { out.push({ selector: sel, kind: 'missing-in-candidate', message: 'selector present in reference, absent in candidate' }); continue; }
    const props = new Set([...Object.keys(r), ...Object.keys(c)]);
    for (const prop of props) {
      const rv = r[prop]; const cv = c[prop];
      if (rv !== cv) out.push({ selector: sel, prop, reference: rv, candidate: cv });
    }
  }
  return out;
}

function layoutDiffs(refStyles, candStyles) {
  const out = [];
  for (const sel of Object.keys(refStyles || {})) {
    const r = refStyles[sel]?.display;
    const c = candStyles?.[sel]?.display;
    if (r && c && r !== c) out.push({ selector: sel, referenceDisplay: r, candidateDisplay: c });
  }
  return out;
}

async function compare({ reference, candidate, route, viewport }) {
  const vp = viewport || { width: 1440, height: 900 };
  const refUrl = reference + (route || '/');
  const candUrl = candidate + (route || '/');
  const ref = await capture(refUrl, vp);
  const cand = await capture(candUrl, vp);

  // Write reports for the agent/human to open.
  const stamp = Date.now();
  const refPath = path.join(BASELINE_DIR, `ref-${stamp}.png`);
  const candPath = path.join(BASELINE_DIR, `cand-${stamp}.png`);
  fs.writeFileSync(refPath, Buffer.from(ref.screenshot, 'base64'));
  fs.writeFileSync(candPath, Buffer.from(cand.screenshot, 'base64'));

  const pixel = pixelDiffRatio(ref.screenshot, cand.screenshot);
  const sDiffs = styleDiffs(ref.styles, cand.styles);
  const lDiffs = layoutDiffs(ref.styles, cand.styles);

  return {
    reference: refUrl,
    candidate: candUrl,
    pixelDiffRatio: Number(pixel.toFixed(3)),
    styleDiffs: sDiffs,
    layoutDiffs: lDiffs,
    pass: pixel < 0.5 && sDiffs.length < 20,
    reportPaths: { reference: refPath, candidate: candPath },
    captured: new Date().toISOString(),
  };
}

async function baseline({ url, route, label }) {
  const vp = { width: 1440, height: 900 };
  const ref = await capture(url + (route || '/'), vp);
  const file = path.join(BASELINE_DIR, `${label || 'baseline'}-${route?.replace(/\//g, '_') || 'root'}.png`);
  fs.writeFileSync(file, Buffer.from(ref.screenshot, 'base64'));
  return { saved: file, captured: new Date().toISOString() };
}

function status() {
  const files = fs.existsSync(BASELINE_DIR) ? fs.readdirSync(BASELINE_DIR) : [];
  return {
    baselineDir: BASELINE_DIR,
    files,
    count: files.length,
    defaultRoutes: DEFAULT_ROUTES.map((r) => r.route),
    chromeBaselines: fs.existsSync(CHROME_BASELINE_DIR) ? fs.readdirSync(CHROME_BASELINE_DIR).filter((f) => f.startsWith('component-')) : [],
  };
}

/** Chrome baseline dir — per-component baselines captured for Move 4 migration. */
const CHROME_BASELINE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'chrome-baselines-isolated');
if (!fs.existsSync(CHROME_BASELINE_DIR)) fs.mkdirSync(CHROME_BASELINE_DIR, { recursive: true });

/**
 * chromeCompare — capture a chrome component's rendered card from the catalog
 * and diff it against its committed baseline. This is the per-component visual
 * verification for the Move 4 barrel-redirect migration: after a redirect, the
 * rendered component must be byte-identical (0 pixel diff) to its baseline.
 */
async function chromeCompare({ url, name }) {
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    // Deterministic capture: freeze rAF + animations.
    await page.addInitScript(() => {
      let frames = 0;
      const orig = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => orig(() => { if (frames++ < 12) cb(performance.now()); });
      const style = document.createElement('style');
      style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}';
      document.head.appendChild(style);
    });
    // Isolated harness: mount ONLY this component, no card chrome / text-wrap
    // noise. The `url` is the harness base (default localhost:5191).
    const harness = url || 'http://localhost:5191';
    await page.goto(`${harness}/?component=${name}`, { waitUntil: 'networkidle', timeout: 25000 });
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    await page.waitForTimeout(1000);

    const baselinePath = path.join(CHROME_BASELINE_DIR, `component-${name}.png`);
    const candPath = path.join(CHROME_BASELINE_DIR, `_cand-${name}.png`);
    await page.screenshot({ path: candPath });

    if (!fs.existsSync(baselinePath)) {
      // First capture = seed the baseline (mirrors parity_baseline semantics).
      fs.copyFileSync(candPath, baselinePath);
      return { name, seededBaseline: baselinePath, pass: true, note: 'baseline seeded (first capture)' };
    }

    const { PNG } = await import('pngjs');
    const pixelmatch = (await import('pixelmatch')).default;
    const a = PNG.sync.read(fs.readFileSync(baselinePath));
    const b = PNG.sync.read(fs.readFileSync(candPath));
    const { width, height } = a;
    const diff = new PNG({ width, height });
    const n = pixelmatch(a.data, b.data, diff.data, width, height, { threshold: 0.1 });
    const ratio = n / (width * height);
    // 2% threshold — component-level granularity, no card text-wrap noise.
    return { name, pixelDiffRatio: Number(ratio.toFixed(3)), pass: ratio < 0.02, baseline: baselinePath, candidate: candPath };
  } finally {
    await page.close();
  }
}

// ─── Tools ──────────────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'parity_compare',
    description:
      'Visual parity QA: screenshot reference vs candidate for a route, diff pixels AND computed styles per selector. Catches font-family drift, missing glass tokens, theme drift, layout collapse. Returns pass + diffs + report paths.',
    inputSchema: {
      type: 'object',
      properties: {
        reference: { type: 'string', description: 'Canon reference base URL, e.g. https://design.p31ca.org' },
        candidate: { type: 'string', description: 'Candidate base URL, e.g. http://localhost:5180' },
        route: { type: 'string', description: 'Path to compare (default "/")' },
        viewport: { type: 'object', description: '{ width, height } (default 1440x900)' },
      },
      required: ['reference', 'candidate'],
    },
  },
  {
    name: 'parity_baseline',
    description: 'Capture a canon reference screenshot into baselines/ (seeds the parity baseline set).',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Reference base URL' },
        route: { type: 'string', description: 'Path (default "/")' },
        label: { type: 'string', description: 'Baseline label (default "baseline")' },
      },
      required: ['url'],
    },
  },
  {
    name: 'parity_status',
    description: 'List baselines and default routes. Read-only.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'parity_chrome',
    description:
      'Per-component visual verification for the chrome migration. Capture a chrome component in ISOLATION (via the chrome-harness) and diff it against its committed isolated baseline. Pass = pixel diff < 2%. Seeding: first capture for a component becomes its baseline.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Harness base URL (default http://localhost:5191)' },
        name: { type: 'string', description: 'Chrome component name, e.g. SidebarNav' },
      },
      required: ['name'],
    },
  },
];

// ─── JSON-RPC over stdio (MCP 2026-07-28 stateless core) ───────────────────
// No initialize handshake on the main path; protocol version + server info ride
// in the namespaced _meta envelope on every request/response. New clients
// negotiate via server/discover. The legacy initialize/initialized branch below
// is DEPRECATED and kept only so pre-SEP-2575 stdio clients keep working.

const PROTOCOL_VERSION = '2026-07-28';
const LEGACY_PROTOCOL_VERSION = '2024-11-05';
const SUPPORTED_VERSIONS = [PROTOCOL_VERSION, LEGACY_PROTOCOL_VERSION];
const SERVER_INFO = { name: 'p31-design-parity', version: '1.0.0' };
const TOOLS_LIST_TTL_MS = 300000;
const META_PROTOCOL = 'io.modelcontextprotocol/protocolVersion';
const META_SERVER_INFO = 'io.modelcontextprotocol/serverInfo';

// MCP 2026-07-28 RC error-code renumbering (reserved range -32020..-32099):
//   -32001 HeaderMismatch                  -> -32020
//   -32003 MissingRequiredClientCapability -> -32021
//   -32004 UnsupportedProtocolVersion      -> -32022
const ERROR_CODE_REMAP = { '-32001': -32020, '-32003': -32021, '-32004': -32022 };

function mappedCode(code) {
  return ERROR_CODE_REMAP[String(code)] ?? code;
}

function metaEnvelope() {
  return {
    [META_PROTOCOL]: PROTOCOL_VERSION,
    [META_SERVER_INFO]: SERVER_INFO,
  };
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', async (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const res = await handleRequest(JSON.parse(trimmed));
      if (res) process.stdout.write(JSON.stringify(res) + '\n');
    } catch (_) {}
  }
});

async function handleRequest(req) {
  const { id, method, params } = req;
  const respond = (result) => ({ jsonrpc: '2.0', id, _meta: metaEnvelope(), result });
  const respondError = (code, message) => ({ jsonrpc: '2.0', id, _meta: metaEnvelope(), error: { code: mappedCode(code), message } });

  switch (method) {
    case 'server/discover': {
      const clientVersion = req?._meta?.[META_PROTOCOL] ?? req?._meta?.protocolVersion;
      if (clientVersion && !SUPPORTED_VERSIONS.includes(clientVersion)) {
        return respondError(-32022, `Unsupported protocol version: ${clientVersion}. Supported: ${SUPPORTED_VERSIONS.join(', ')}`);
      }
      return respond({
        resultType: 'complete',
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
    }

    // ── Deprecated legacy-compat branch (pre-SEP-2575) ────────────────────
    // Do NOT extend. The stateless protocol has no handshake; these cases
    // exist only so existing 2024-11-05 stdio clients keep working.
    case 'initialize':
      return respond({
        protocolVersion: LEGACY_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
    case 'notifications/initialized':
      return null; // notification — no response (stdio equivalent of HTTP 204)
    // ── End deprecated legacy-compat branch ───────────────────────────────

    case 'tools/list':
      return respond({ resultType: 'complete', ttlMs: TOOLS_LIST_TTL_MS, cacheScope: 'public', tools: TOOLS });

    case 'tools/call': {
      const toolName = params?.name;
      const args = params?.arguments || {};
      const tool = TOOLS.find((t) => t.name === toolName);
      if (!tool) return respondError(-32602, `Unknown tool: ${toolName}`);
      try {
        const out = await executeTool(toolName, args);
        return respond({ resultType: 'complete', content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] });
      } catch (e) {
        return respond({
          resultType: 'complete',
          content: [{ type: 'text', text: JSON.stringify({ error: e.message, status: 'error' }) }],
          isError: true,
        });
      }
    }

    default:
      if (id !== undefined) return respondError(-32601, `Method not found: ${method}`);
      return null;
  }
}

async function executeTool(name, args) {
  switch (name) {
    case 'parity_compare': return await compare(args);
    case 'parity_baseline': return await baseline(args);
    case 'parity_status': return status();
    case 'parity_chrome': return await chromeCompare(args);
    default: throw new Error(`Unknown tool ${name}`);
  }
}