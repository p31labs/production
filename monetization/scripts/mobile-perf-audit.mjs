#!/usr/bin/env node
/**
 * mobile-perf-audit — probe the LIVE P31 Capital portal shell and report
 * server-side (datacenter → edge) timing plus gzip asset sizes.
 *
 * Run:  node scripts/mobile-perf-audit.mjs [--json] [--url https://…] [--timeout ms]
 * Env:  PORTAL_URL overrides the default portal (mirrors evidence-collect.mjs).
 *
 * Shell probes (curl-equivalent, granular socket timing): DNS / TCP / TLS / TTFB
 * for /, /manifest.webmanifest, /sw.js, /icons/icon-192.png.
 *
 * Asset report: fetches the HTML, extracts same-origin hashed <script>/<link>
 * JS+CSS URLs, and reports each asset's gzip wire size (Content-Length when
 * present, else a raw Accept-Encoding: gzip byte count) plus decoded size.
 *
 * Budgets — SHELL (this run, server-side): DNS ≤ 200ms · TCP ≤ 300ms ·
 * TLS ≤ 400ms · TTFB < 800ms (soft exit gate) · total ≤ 2500ms.
 * Budgets — ON-DEVICE (NOT measured here): the 2026 fintech budget
 * TTID ≤ 1.1s P90 · TTFD ≤ 1.6s P90 applies to a real device, read from
 * window.__p31Perf (ttfdMs, ttidMs, inpMs, navType, perfEntries) and the
 * localStorage ring buffer at key p31:perf. Server shell timings cannot
 * measure INP/TTID/TTFD.
 *
 * Exit: 0 if every shell probe passes the soft shell budget (TTFB < 800ms
 * required on each), 1 otherwise (incl. any probe error or non-2xx/3xx).
 */
import { request as httpsRequest, Agent as HttpsAgent } from 'node:https';
import { request as httpRequest } from 'node:http';
import { performance } from 'node:perf_hooks';

const args = process.argv.slice(2);
const json = args.includes('--json');
const flagValue = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
};
const PORTAL = (process.env.PORTAL_URL || flagValue('--url') || 'https://p31-monetization.trimtab-signal.workers.dev').replace(/\/+$/, '');
const TIMEOUT_MS = Number(flagValue('--timeout') || 10000);
const UA = 'p31-mobile-perf-audit/1.0';

const SHELL_BUDGET = { dnsMs: 200, tcpMs: 300, tlsMs: 400, ttfbMs: 800, totalMs: 2500 };
const FINTECH_BUDGET = {
  ttidMs: 1100, // 2026 fintech — TTID ≤ 1.1s P90, on-device only
  ttfdMs: 1600, // 2026 fintech — TTFD ≤ 1.6s P90, on-device only
  note: 'on-device only — read window.__p31Perf / localStorage p31:perf; server shell timings cannot measure INP/TTID/TTFD',
};

const rnd = (n) => Math.round(n);
const now = () => performance.now();
const fmtMs = (v) => (v == null ? '—' : `${rnd(v)}ms`);
const fmtBytes = (n) => (n == null ? '—' : `${n.toLocaleString('en-US')} B`);

/**
 * Curl-equivalent shell probe via node:https. Each probe opens a fresh
 * connection so DNS / TCP connect / TLS handshake / TTFB are all observable
 * (equivalent to curl -w time_namelookup/time_connect/time_appconnect/
 * time_starttransfer). Body is drained so sockets close cleanly.
 */
function probe(resource) {
  const url = `${PORTAL}${resource}`;
  return new Promise((resolve) => {
    const t = { resource, url, start: now() };
    let settled = false;
    const done = (extra) => {
      if (settled) return;
      settled = true;
      resolve(Object.assign(t, extra));
    };
    const isHttps = url.startsWith('https:');
    const requestFn = isHttps ? httpsRequest : httpRequest;
    const agent = isHttps ? new HttpsAgent({ keepAlive: false }) : undefined;
    const req = requestFn(url, {
      method: 'GET',
      agent,
      headers: { 'Accept-Encoding': 'gzip', 'User-Agent': UA },
    }, (res) => {
      t.status = res.statusCode;
      t.ttfbMs = rnd(now() - t.start);
      t.contentEncoding = res.headers['content-encoding'] || null;
      t.contentLength = res.headers['content-length'] || null;
      let wire = 0;
      res.on('data', (chunk) => { wire += chunk.length; });
      res.on('end', () => done({ wireBytes: wire, totalMs: rnd(now() - t.start) }));
      res.on('error', (e) => done({ error: e.message }));
    });
    req.on('socket', (socket) => {
      socket.on('lookup', () => { t.dnsMs = rnd(now() - t.start); });
      socket.on('connect', () => { t.tcpMs = rnd(now() - t.start); });
      if (isHttps) socket.on('secureConnect', () => { t.tlsMs = rnd(now() - t.start); });
    });
    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error(`timeout after ${TIMEOUT_MS}ms`)));
    req.on('error', (e) => done({ error: t.error || e.message }));
    req.end();
  });
}

/** gzip size of a hashed asset. Prefers Content-Length (compressed wire size
 * when the server compresses); falls back to a raw byte count via probe() when
 * the header is absent. Decoded size comes from the fetch body (auto-decoded). */
async function assetSize(path) {
  const url = new URL(path, PORTAL).href;
  const entry = { path, url, status: null, encoding: null, gzipBytes: null, decodedBytes: null, error: null };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(url, { headers: { 'Accept-Encoding': 'gzip', 'User-Agent': UA }, signal: ctrl.signal, redirect: 'follow' });
    clearTimeout(timer);
    const buf = Buffer.from(await res.arrayBuffer());
    const encoding = res.headers.get('content-encoding');
    const cl = res.headers.get('content-length');
    entry.status = res.status;
    entry.encoding = encoding || 'identity';
    entry.decodedBytes = buf.length;
    const compressed = encoding && ['gzip', 'br', 'deflate'].includes(encoding);
    if (compressed && cl) {
      entry.gzipBytes = Number(cl);
    } else if (compressed) {
      const raw = await probe(path); // raw wire bytes (node:https does not auto-decompress)
      entry.gzipBytes = raw.error ? null : raw.wireBytes;
    } else {
      entry.gzipBytes = buf.length;
    }
  } catch (e) {
    entry.error = e.message;
  }
  return entry;
}

/** Extract same-origin hashed JS/CSS asset paths from HTML <script>/<link> tags. */
function extractAssets(html) {
  const origin = new URL(PORTAL).origin;
  const found = new Set();
  const push = (href) => {
    if (!href) return;
    let u;
    try { u = new URL(href, PORTAL); } catch { return; }
    if (u.origin !== origin) return;
    if (!/\.(?:js|css)(?:\?|$)/.test(u.pathname)) return;
    if (u.pathname.endsWith('.map')) return;
    found.add(u.pathname);
  };
  for (const m of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)) push(m[1]);
  for (const m of html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["']/gi)) push(m[1]);
  return [...found].sort();
}

const stageFailures = (t) => {
  const out = [];
  for (const key of ['dns', 'tcp', 'tls', 'ttfb', 'total']) {
    const v = t[`${key}Ms`];
    if (v == null) continue;
    if (v > SHELL_BUDGET[`${key}Ms`]) out.push(`${key.toUpperCase()}=${v}ms > ${SHELL_BUDGET[`${key}Ms`]}ms`);
  }
  if (t.error) out.push(`error: ${t.error}`);
  if (t.status != null && t.status >= 400) out.push(`HTTP ${t.status}`);
  return out;
};

const run = async () => {
  const probes = [];
  const rows = ['/', '/manifest.webmanifest', '/sw.js', '/icons/icon-192.png'];
  for (const r of rows) probes.push(await probe(r));
  const probeEval = probes.map((t) => ({ ...t, failures: stageFailures(t), pass: stageFailures(t).length === 0 }));

  let assets = [];
  let htmlError = null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(`${PORTAL}/`, { headers: { 'Accept-Encoding': 'gzip', 'User-Agent': UA }, signal: ctrl.signal, redirect: 'follow' });
    clearTimeout(timer);
    const buf = Buffer.from(await res.arrayBuffer());
    assets = await Promise.all(extractAssets(buf.toString('utf8')).map(assetSize));
  } catch (e) {
    htmlError = e.message;
  }

  const shellPass = probeEval.length > 0 && probeEval.every((t) => t.pass);
  const exit = shellPass ? 0 : 1;
  const exitReason = shellPass
    ? 'every shell probe passed the soft shell budget (TTFB < 800ms)'
    : `shell budget not met (TTFB < 800ms required per probe; ${probeEval.filter((t) => !t.pass).length} of ${probeEval.length} probes failed)`;
  const probedAt = new Date().toISOString();

  const report = {
    portalUrl: PORTAL,
    probedAt,
    shellBudget: { ...SHELL_BUDGET, kind: 'server-side shell (datacenter → edge)' },
    fintechBudget: FINTECH_BUDGET,
    shellProbes: probeEval.map((t) => ({
      resource: t.resource,
      status: t.status ?? null,
      dnsMs: t.dnsMs ?? null,
      tcpMs: t.tcpMs ?? null,
      tlsMs: t.tlsMs ?? null,
      ttfbMs: t.ttfbMs ?? null,
      totalMs: t.totalMs ?? null,
      wireBytes: t.wireBytes ?? null,
      contentEncoding: t.contentEncoding ?? null,
      pass: t.pass,
      failures: t.failures,
    })),
    assets,
    htmlError,
    shellPass,
    exit,
    exitReason,
  };

  if (json) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(exit);
  }

  const L = '─'.repeat(96);
  console.log(`\nP31 Capital — mobile shell performance audit`);
  console.log(`Portal: ${PORTAL}   ·   probed ${probedAt}`);
  console.log(L);
  console.log(`SHELL probes (server-side, datacenter → edge) — SHELL BUDGET: DNS ≤ ${SHELL_BUDGET.dnsMs}ms · TCP ≤ ${SHELL_BUDGET.tcpMs}ms · TLS ≤ ${SHELL_BUDGET.tlsMs}ms · TTFB < ${SHELL_BUDGET.ttfbMs}ms · total ≤ ${SHELL_BUDGET.totalMs}ms`);
  console.log(`⚠  Fintech budget TTID ≤ 1.1s P90 / TTFD ≤ 1.6s P90 is ON-DEVICE ONLY. INP/TTID/TTFD must be read from`);
  console.log(`   window.__p31Perf and localStorage key p31:perf on a real device — server shell timing cannot measure them.`);
  console.log(L);
  const header = ['Resource', 'HTTP', 'DNS', 'TCP', 'TLS', 'TTFB', 'Total', 'Verdict'];
  console.log(header.map((h, i) => h.padEnd(i === 0 ? 24 : 9)).join(''));
  for (const t of probeEval) {
    const res = t.resource.length > 23 ? t.resource.slice(0, 20) + '…' : t.resource;
    const cells = [
      res.padEnd(24),
      String(t.status ?? (t.error ? 'ERR' : '—')).padEnd(9),
      fmtMs(t.dnsMs).padEnd(9),
      fmtMs(t.tcpMs).padEnd(9),
      fmtMs(t.tlsMs).padEnd(9),
      fmtMs(t.ttfbMs).padEnd(9),
      fmtMs(t.totalMs).padEnd(9),
      t.pass ? 'PASS' : 'FAIL',
    ];
    console.log(cells.join(''));
    if (t.failures.length) console.log(`  ↳ ${t.failures.join(' · ')}`);
  }
  console.log(L);
  console.log(`SHELL VERDICT: ${shellPass ? 'PASS' : 'FAIL'}  — ${exitReason}`);

  console.log(`\nHashed JS/CSS assets (Accept-Encoding: gzip)`);
  console.log(L);
  if (htmlError) {
    console.log(`HTML fetch failed: ${htmlError} — cannot extract asset URLs.`);
  } else if (!assets.length) {
    console.log(`No same-origin .js/.css assets found in ${PORTAL}/ — is a fresh build deployed?`);
  } else {
    console.log(['Asset'.padEnd(46), 'gzip B'.padEnd(12), 'decoded B'.padEnd(12), 'encoding'.padEnd(9), 'HTTP'].join(''));
    for (const a of assets) {
      const name = a.path.length > 45 ? a.path.slice(0, 42) + '…' : a.path;
      console.log([
        name.padEnd(46),
        fmtBytes(a.gzipBytes).padEnd(12),
        fmtBytes(a.decodedBytes).padEnd(12),
        (a.encoding || '—').padEnd(9),
        a.error ? `ERR ${a.error}` : String(a.status ?? '—'),
      ].join(''));
    }
  }
  console.log(L);
  console.log(`Exit: ${exit}  (0 = shell budget met, TTFB < ${SHELL_BUDGET.ttfbMs}ms on every probe)`);
  console.log(`On-device budgets to compare against (Phase B instrumentation): TTID ≤ 1.1s P90 · TTFD ≤ 1.6s P90.\n`);
  process.exit(exit);
};

run().catch((e) => {
  console.error(`mobile-perf-audit failed: ${e.message}`);
  process.exit(1);
});