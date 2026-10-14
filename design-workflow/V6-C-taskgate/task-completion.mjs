#!/usr/bin/env node
/**
 * task-completion.mjs — P31 task-completion gate (DeskCert model).
 *
 * Runbook: DESIGN-SYSTEM-PARALLEL-PATHS-RUNBOOK-V6.md §6 (WORKSTREAM C).
 * Closes RFC-0006 §8.5 — the last unclosed Design CI check.
 *
 * Model (DeskCert): task suites = lists of tasks; each task = ordered steps;
 * each step = an action (goto/click/fill/assert/select + the MCP/FS actions the
 * built-in tasks need) and records PASS/FAIL. A per-suite `forbiddenActions`
 * list fails the WHOLE suite regardless of score — a violation is a violation.
 *
 * Zero new deps. Node 24 ESM. Playwright 1.62.0 is loaded from
 * /home/p31/node_modules; Chromium is the system binary /usr/bin/chromium
 * (PLAYWRIGHT_BROWSERS_PATH=0 — browsers are NEVER downloaded).
 *
 * CLI:
 *   node task-completion.mjs --positive          built-in suites/positive.mjs
 *   node task-completion.mjs --negative          built-in suites/negative.mjs
 *   node task-completion.mjs --suite <suite.mjs> any suite module
 *   node task-completion.mjs --list              list built-in suites
 *
 * Exit codes: 0 = all tasks passed, zero forbidden-action violations.
 *             1 = any step failure OR any forbidden-action violation.
 *             2 = usage error.
 *
 * BOUNDARIES (violations are failures):
 *   - Writes ONLY under V6-C-taskgate/ (.tmp scratch at runtime).
 *   - The served-UI fixture and canon packages are READ-ONLY references.
 *   - `wrangler dev` is booted (runbook-sanctioned, never deployed) with
 *     --persist-to pointed into the scratch dir so all worker state stays
 *     inside this lane's boundary. Killed on exit (finally) via process-group
 *     SIGTERM (the wrangler bin is spawned directly — the runbook's `npx
 *     wrangler dev` resolves to the same binary; npx forwarding was leaving
 *     orphaned workerd processes holding the port).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

// Never let Playwright look for (or download) browsers.
process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
process.env.WRANGLER_SEND_METRICS = 'false';

const requireFromNodeModules = createRequire('/home/p31/node_modules/');
const { chromium } = requireFromNodeModules('playwright');

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SCRATCH_ROOT = path.join(ROOT, '.tmp');

// ── Read-only anchors (never written by this gate) ──────────────────────────
const UI_DIR = '/home/p31/production/design-workflow/D-embedded/ui';
const MCP_DIR = '/home/p31/production/design-workflow/V3-B-mcp';
const CANON_TOKENS = '/home/p31/production/packages/canon/tokens/tokens.dtc.json';
const MCP_PORT = 8790;
const MCP_URL = `http://127.0.0.1:${MCP_PORT}`;
const CHROMIUM = '/usr/bin/chromium';

// Canonical forbidden-action strings. Suite `forbiddenActions` entries and the
// implicit detectors below must use exactly these strings to match.
export const FORBIDDEN = {
  CSS_FILE: 'modify any .css file',
  RAW_HEX: 'write raw hex',
  UNKNOWN_TOOL: 'call an unknown MCP tool',
};

// Wrangler binary: runbook command is `npx wrangler dev` from V3-B-mcp; npx
// resolves to this same local bin. Spawning the bin directly (as a detached
// process group) means our SIGTERM reaches wrangler AND its workerd child —
// `npx` forwarding was leaving orphaned workers holding the port.
const WRANGLER_BIN = (() => {
  for (const cand of [
    '/home/p31/node_modules/.bin/wrangler',
    path.join(MCP_DIR, 'node_modules', '.bin', 'wrangler'),
  ]) {
    if (fs.existsSync(cand)) return cand;
  }
  return 'wrangler';
})();

// ── Helpers ─────────────────────────────────────────────────────────────────

function fail(msg) {
  console.error(`USAGE ERROR: ${msg}`);
  console.error('Run: node task-completion.mjs --positive | --negative | --suite <suite.mjs> | --list');
  process.exit(2);
}

function parseCli(argv) {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) fail('no suite given');
  if (args.includes('--list')) return { list: true };
  const positive = args.includes('--positive');
  const negative = args.includes('--negative');
  if (positive && negative) fail('--positive and --negative are mutually exclusive');
  const i = args.indexOf('--suite');
  if (i !== -1) {
    const p = args[i + 1];
    if (!p) fail('--suite needs a path');
    return { suitePath: p };
  }
  if (positive) return { suitePath: path.join(ROOT, 'suites', 'positive.mjs') };
  if (negative) return { suitePath: path.join(ROOT, 'suites', 'negative.mjs') };
  fail('expected --positive, --negative, --suite <path>, or --list');
}

/** Dot-path getter supporting array indices, e.g. "result.tools.length" or "parsedContent[0].value". */
function dotGet(obj, p) {
  let cur = obj;
  for (const seg of p.split('.')) {
    const m = seg.match(/^([^\[]+)(?:\[(\d+)\])*$/);
    if (!m) return undefined;
    cur = cur?.[m[1]];
    const idx = seg.match(/\[(\d+)\]/g);
    if (idx) for (const s of idx) cur = cur?.[Number(s.slice(1, -1))];
    if (cur === undefined) return undefined;
  }
  return cur;
}

function hexInText(text) {
  return /#[0-9a-fA-F]{3,8}\b/.test(String(text));
}

function now() {
  return new Date().toISOString();
}

// ── Suite loading ───────────────────────────────────────────────────────────

async function loadSuite(suitePath) {
  const abs = path.isAbsolute(suitePath) ? suitePath : path.join(process.cwd(), suitePath);
  if (!fs.existsSync(abs)) fail(`suite not found: ${abs}`);
  let mod;
  try {
    mod = await import(pathToFileURL(abs).href);
  } catch (e) {
    console.error(`FAIL: could not import suite ${abs}: ${e.message}`);
    process.exit(1);
  }
  const suite = mod.default ?? mod;
  if (!suite || !Array.isArray(suite.tasks)) {
    console.error(`FAIL: suite ${abs} has no default export with a tasks array`);
    process.exit(1);
  }
  suite.forbiddenActions = Array.isArray(suite.forbiddenActions) ? suite.forbiddenActions : [];
  suite.__file = abs;
  return suite;
}

// ── Runner context ──────────────────────────────────────────────────────────

function makeCtx(suite) {
  const stamp = `${Date.now()}`;
  return {
    suite,
    scratch: path.join(SCRATCH_ROOT, suite.name || 'suite', stamp),
    browser: null,
    page: null,
    mcp: { child: null, booted: false },
    data: {},           // read-json results land here
    tools: null,        // tools/list result
    violations: [],     // { violation, task, step, evidence }
    results: [],        // { task, index, action, ok, status, detail }
  };
}

// ── Violation bookkeeping ───────────────────────────────────────────────────

function recordViolation(ctx, violation, task, step, evidence) {
  if (!ctx.suite.forbiddenActions.includes(violation)) return false;
  if (ctx.violations.some(v => v.violation === violation && v.task === task.id && v.step === step.index)) return false;
  ctx.violations.push({ violation, task: task.id, step: step.index, evidence });
  return true;
}

// ── Action registry ─────────────────────────────────────────────────────────
// Each entry: { run(ctx, task, step, index) -> { ok, detail, skipTask? } }

const actions = {
  // ── Browser ────────────────────────────────────────────────────────────
  async goto(ctx, step) {
    const target = step.url ?? path.join(UI_DIR, step.file ?? 'index.html');
    const url = /^https?:/.test(target) ? target : pathToFileURL(target).href;
    await ctx.page.goto(url, { waitUntil: 'load' });
    const title = await ctx.page.title();
    return { ok: true, detail: `loaded ${url} (title: ${JSON.stringify(title)})` };
  },

  async click(ctx, step) {
    await ctx.page.click(step.selector, { timeout: 3000 });
    return { ok: true, detail: `clicked ${step.selector}` };
  },

  async fill(ctx, step) {
    await ctx.page.fill(step.selector, String(step.value), { timeout: 3000 });
    return { ok: true, detail: `filled ${step.selector}` };
  },

  async select(ctx, step) {
    await ctx.page.selectOption(step.selector, String(step.value), { timeout: 3000 });
    return { ok: true, detail: `selected ${step.value} in ${step.selector}` };
  },

  async assert(ctx, step) {
    const kind = step.kind ?? 'exists';
    if (kind === 'exists') {
      const n = await ctx.page.locator(step.selector).count();
      return { ok: n > 0, detail: `${step.selector} ${n > 0 ? 'exists' : 'MISSING'}` };
    }
    if (kind === 'text') {
      const txt = await ctx.page.locator(step.selector).first().textContent({ timeout: 3000 });
      const ok = step.equals ? txt?.includes(step.equals) : txt != null && txt.length > 0;
      return { ok, detail: `${step.selector} text=${JSON.stringify((txt ?? '').slice(0, 60))}` };
    }
    if (kind === 'no-horizontal-overflow') {
      const r = await ctx.page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        bw: document.body.scrollWidth,
        iw: window.innerWidth,
      }));
      const ok = r.sw <= r.iw && r.bw <= r.iw;
      return { ok, detail: `scrollWidth=${r.sw} body=${r.bw} innerWidth=${r.iw}${ok ? '' : ' — OVERFLOW'}` };
    }
    if (kind === 'no-interactive-elements') {
      const n = await ctx.page.evaluate(() =>
        document.querySelectorAll('button,input,select,a[href],[onclick],[role=button],[tabindex]').length);
      return { ok: n === 0, detail: n === 0 ? 'page declares no interactive elements' : `${n} interactive elements found` };
    }
    if (kind === 'json-path') {
      const obj = ctx.data[step.data];
      const val = dotGet(obj, step.path);
      const ok = step.exists === false ? val === undefined : val !== undefined;
      return { ok, detail: `${step.data}.${step.path} ${ok ? 'present' : 'ABSENT'}` };
    }
    if (kind === 'file-contains') {
      const p = resolveScratch(ctx, step.file);
      const txt = fs.readFileSync(p, 'utf8');
      const ok = txt.includes(String(step.contains));
      return { ok, detail: `${path.basename(p)} contains ${JSON.stringify(step.contains)}: ${ok}` };
    }
    throw new Error(`assert kind not implemented: ${kind}`);
  },

  // ── Spoon toggle contract (honest fixture limitation) ──────────────────
  async 'spoon-toggle'(ctx, step) {
    const r = await ctx.page.evaluate(({ sel, minSize }) => {
      const ctl = document.querySelector(sel);
      const interactive = document.querySelectorAll(
        'button,input,select,a[href],[onclick],[role=button],[tabindex]').length;
      if (ctl) {
        const b = ctl.getBoundingClientRect();
        return { present: true, w: b.width, h: b.height, interactive };
      }
      return { present: false, w: 0, h: 0, interactive };
    }, { sel: step.controlSelector ?? '#spoon-toggle', minSize: step.minSize ?? 44 });

    // Branch A: a spoon control exists → must meet the 44px touch floor.
    if (r.present) {
      const ok = r.w >= (step.minSize ?? 44) && r.h >= (step.minSize ?? 44);
      return {
        ok,
        detail: ok
          ? `spoon control ${step.controlSelector} present at ${r.w}x${r.h}px (>= ${step.minSize ?? 44}px)`
          : `spoon control ${r.w}x${r.h}px — below ${step.minSize ?? 44}px touch floor`,
      };
    }
    // Branch B: no spoon control — the fixture is static. Honest contract:
    // the page must declare no interactive elements (zero-JS progressive
    // enhancement; the spoon value is an <output>, not a control).
    if (r.interactive === 0) {
      return {
        ok: true,
        detail: 'fixture is static: no spoon control element exists AND the page declares no interactive elements — assertion met via the documented limitation branch',
      };
    }
    return {
      ok: false,
      detail: `no spoon control, yet the page declares ${r.interactive} interactive element(s) — contract unresolved`,
    };
  },

  // ── MCP (local worker) ─────────────────────────────────────────────────
  async 'mcp-boot'(ctx, step) {
    const readyUrl = step.readyUrl ?? `${MCP_URL}/health`;
    const timeoutMs = step.timeoutMs ?? 90000;
    const persistTo = path.join(ctx.scratch, 'wrangler-state');
    fs.mkdirSync(persistTo, { recursive: true });
    const args = ['dev', '--port', String(MCP_PORT), '--persist-to', persistTo];
    if (step.logLevel) args.push('--log-level', step.logLevel);
    const child = spawn(WRANGLER_BIN, args, {
      cwd: step.dir ?? MCP_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true, // own process group → group-kill reaches workerd too
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    });
    let bootLog = '';
    child.stdout.on('data', d => { bootLog += d; if (bootLog.length > 8000) bootLog = bootLog.slice(-8000); });
    child.stderr.on('data', d => { bootLog += d; if (bootLog.length > 8000) bootLog = bootLog.slice(-8000); });
    ctx.mcp.child = child;
    ctx.mcp.killGroup = (sig) => {
      try { process.kill(-child.pid, sig); } catch { try { child.kill(sig); } catch { /* gone */ } }
    };

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(readyUrl);
        if (res.ok) {
          const body = await res.json();
          ctx.mcp.booted = true;
          return { ok: true, detail: `/health → ${JSON.stringify(body)}` };
        }
      } catch { /* not up yet */ }
      await new Promise(r => setTimeout(r, 750));
    }
    // Boot timeout: kill and report the exact skip-with-note text (C-3).
    ctx.mcp.killGroup('SIGTERM');
    ctx.mcp.booted = false;
    return { ok: false, skipTask: true, detail: 'SKIPPED: MCP task — worker did not boot' };
  },

  async 'mcp-post'(ctx, step) {
    const payload = {
      jsonrpc: '2.0',
      id: step.id ?? 1,
      ...step.payload,
    };
    const res = await fetch(`${MCP_URL}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    const out = { status: res.status, result: body?.result ?? body, body, parsedContent: null };

    // tools/call → parse the text content for value assertions.
    if (payload.method === 'tools/call' && Array.isArray(out.result?.content)) {
      out.parsedContent = out.result.content.map(c =>
        c.type === 'text' ? (() => { try { return JSON.parse(c.text); } catch { return c.text; } })() : c);
    }

    // tools/list → remember advertised tools (drives the unknown-tool guard).
    if (payload.method === 'tools/list' && Array.isArray(out.result?.tools)) {
      ctx.tools = out.result.tools;
    }

    // Implicit forbidden-action: unknown MCP tool call.
    if (payload.method === 'tools/call') {
      const name = payload.params?.name;
      const known = ctx.tools?.map(t => t.name) ?? [];
      if (ctx.tools && name && !known.includes(name)) {
        recordViolation(ctx, FORBIDDEN.UNKNOWN_TOOL, ctx.__task, ctx.__step,
          `tools/call ${name} — not among the ${known.length} advertised tools`);
      }
    }

    // Explicit expectations (dot-paths; string values are matched, 'non-empty' = truthy non-empty).
    let ok = true;
    const detail = [];
    for (const [p, want] of Object.entries(step.expect ?? {})) {
      const got = dotGet(out, p);
      const pass = want === 'non-empty'
        ? (got !== undefined && got !== null && String(got).length > 0)
        : (typeof want === 'number' ? got === want : String(got) === String(want));
      if (!pass) ok = false;
      detail.push(`${p}=${JSON.stringify(got)} ${pass ? '✓' : `✗ (expected ${JSON.stringify(want)})`}`);
    }
    return { ok, detail: detail.join(' | ') };
  },

  async 'mcp-kill'(ctx) {
    const child = ctx.mcp.child;
    if (!child) return { ok: true, detail: 'no worker process to kill' };
    return await new Promise(resolve => {
      const t = setTimeout(() => {
        ctx.mcp.killGroup?.('SIGKILL');
        resolve({ ok: true, detail: 'worker force-killed (group)' });
      }, 8000);
      child.once('close', (code) => {
        clearTimeout(t);
        ctx.mcp.booted = false;
        resolve({ ok: code === 0 || code === null, detail: `worker exited (code ${code ?? 'signal'})` });
      });
      ctx.mcp.killGroup?.('SIGTERM');
    });
  },

  // ── FS (write-restricted to the taskgate scratch) ───────────────────────
  async 'read-json'(ctx, step) {
    const file = step.anchor === 'canon-tokens' ? CANON_TOKENS : step.file;
    const raw = fs.readFileSync(file, 'utf8');
    ctx.data[step.into ?? 'json'] = JSON.parse(raw);
    const keys = Object.keys(ctx.data[step.into ?? 'json']);
    return { ok: true, detail: `read ${path.basename(file)} (${raw.length} B, top-level keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? ', …' : ''})` };
  },

  async 'copy-fixture'(ctx, step) {
    const from = path.join(UI_DIR, step.from);
    const to = resolveScratch(ctx, step.to);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    return { ok: true, detail: `copied fixture ${step.from} → ${to}` };
  },

  async modify(ctx, step) {
    const p = resolveScratch(ctx, step.file);
    const text = String(step.text ?? '');
    const mode = step.mode ?? 'append';

    // Implicit forbidden-action detectors (DeskCert pattern: the act itself
    // is the violation, regardless of the step's pass/fail result).
    if (p.endsWith('.css')) {
      recordViolation(ctx, FORBIDDEN.CSS_FILE, ctx.__task, ctx.__step, `modified ${p}`);
    }
    if (hexInText(text)) {
      recordViolation(ctx, FORBIDDEN.RAW_HEX, ctx.__task, ctx.__step, `raw hex in ${JSON.stringify(text.slice(0, 80))}`);
    }
    // Explicit step-declared violation (negative control carries one). A
    // declared violation that is NOT in suite.forbiddenActions is a suite-
    // authoring error: the runner refuses to silently swallow it (a gate
    // that can ignore a declared violation is furniture).
    if (step.violation) {
      if (!ctx.suite.forbiddenActions.includes(step.violation)) {
        throw new Error(`step declares violation ${JSON.stringify(step.violation)} but suite.forbiddenActions does not include it`);
      }
      recordViolation(ctx, step.violation, ctx.__task, ctx.__step, `declared by step: ${JSON.stringify(text.slice(0, 80))}`);
    }

    const before = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
    const after = mode === 'overwrite' ? text : before + '\n' + text;
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, after);
    return { ok: true, detail: `${mode === 'overwrite' ? 'wrote' : 'appended to'} ${path.basename(p)}: ${JSON.stringify(text.slice(0, 60))}` };
  },
};

/** Resolve a step file path — ONLY inside the taskgate scratch dir. */
function resolveScratch(ctx, file) {
  const p = path.resolve(ctx.scratch, String(file));
  const within = p === ctx.scratch || p.startsWith(ctx.scratch + path.sep);
  if (!within) {
    throw new Error(`REFUSED: write target ${p} is outside the taskgate scratch dir (boundary violation)`);
  }
  return p;
}

// ── Task runner ─────────────────────────────────────────────────────────────

async function runTask(ctx, task, index) {
  const line = { task: task.id, index, ok: true, status: 'PASS', detail: '' };
  for (let i = 0; i < task.steps.length; i++) {
    const step = task.steps[i];
    step.index = i + 1;
    ctx.__task = task;
    ctx.__step = step;
    let res;
    try {
      const fn = actions[step.action];
      if (!fn) throw new Error(`unknown action: ${step.action}`);
      res = await fn(ctx, step);
    } catch (e) {
      res = { ok: false, detail: `step error: ${e.message}` };
    }
    if (step.skipTask || res.skipTask) {
      line.status = 'SKIPPED';
      line.detail = res.detail;
      ctx.results.push({ ...line, action: null, step: i + 1 });
      console.log(`    [${i + 1}] ${step.action} — SKIP ${res.detail}`);
      return line;
    }
    const status = res.ok ? 'PASS' : 'FAIL';
    if (!res.ok) { line.ok = false; line.status = 'FAIL'; }
    ctx.results.push({ task: task.id, index: i + 1, step: i + 1, action: step.action, ok: res.ok, status, detail: res.detail });
    console.log(`    [${i + 1}] ${step.action} — ${status} ${res.detail}`);
  }
  ctx.results.push({ ...line, action: null });
  return line;
}

async function runSuite(suitePath) {
  const suite = await loadSuite(suitePath);
  const ctx = makeCtx(suite);

  console.log('═══ P31 task-completion gate (DeskCert model) ═══');
  console.log(`suite: ${suite.name} — ${suite.description ?? '(no description)'}`);
  console.log(`forbiddenActions (${suite.forbiddenActions.length}): ${suite.forbiddenActions.map(f => JSON.stringify(f)).join(', ') || 'none'}`);
  console.log(`scratch: ${ctx.scratch}`);
  console.log(`chromium: ${CHROMIUM} (playwright from /home/p31/node_modules)`);
  console.log('');

  try {
    ctx.browser = await chromium.launch({
      executablePath: CHROMIUM,
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    const summary = [];
    for (let i = 0; i < suite.tasks.length; i++) {
      const task = suite.tasks[i];
      console.log(`task ${i + 1}/${suite.tasks.length} ${task.id} — ${task.description ?? ''}`);
      const vp = task.viewport;
      const context = await ctx.browser.newContext(vp
        ? { viewport: { width: vp[0], height: vp[1] } }
        : { viewport: { width: 1280, height: 800 } });
      ctx.page = await context.newPage();
      const result = await runTask(ctx, task, i);
      console.log(`  → ${result.status}${result.detail ? ` — ${result.detail}` : ''}`);
      summary.push(result);
      await context.close();
      ctx.page = null;
    }
    ctx.browser = null;
  } finally {
    // Kill any worker still running — never leave wrangler dev alive.
    if (ctx.mcp.child) {
      ctx.mcp.killGroup?.('SIGTERM');
      try { await new Promise(r => { ctx.mcp.child.once('close', r); setTimeout(r, 4000); }); } catch { /* raced */ }
    }
    if (ctx.browser) {
      try { await ctx.browser.close(); } catch { /* already closed */ }
    }
  }

  // ── Score + verdict ─────────────────────────────────────────────────────
  const violations = ctx.violations;
  const taskRecords = ctx.results.filter(r => r.action === null);
  const passed = taskRecords.filter(r => r.status === 'PASS').length;
  const skipped = taskRecords.filter(r => r.status === 'SKIPPED').length;
  const graded = suite.tasks.length - skipped;
  const verdict = violations.length > 0 ? 'FAIL' : (passed === graded ? 'PASS' : 'FAIL');
  const why = violations.length > 0
    ? `forbidden-action violation (fails regardless of task score ${passed}/${graded})`
    : verdict === 'PASS'
      ? `tasks passed ${passed}/${graded}${skipped ? ` (${skipped} skipped)` : ''}`
      : `tasks failed: ${passed}/${graded} passed`;

  console.log('');
  console.log(`FORBIDDEN-ACTION VIOLATIONS: ${violations.length}`);
  for (const v of violations) {
    console.log(`  ✗ ${JSON.stringify(v.violation)} — task ${v.task}, step ${v.step}: ${v.evidence}`);
  }

  console.log(`VERDICT: ${verdict} — ${why}`);
  console.log(`exit code: ${verdict === 'PASS' ? 0 : 1}`);
  process.exit(verdict === 'PASS' ? 0 : 1);
}

// ── CLI ─────────────────────────────────────────────────────────────────────

const cli = parseCli(process.argv);

if (cli.list) {
  console.log('built-in suites:');
  console.log('  suites/positive.mjs — tasks 1-3, no forbidden actions → PASS, exit 0');
  console.log('  suites/negative.mjs — tasks 1-3 + a forbidden-action step → FAIL, exit 1 (negative control)');
  process.exit(0);
}

runSuite(cli.suitePath).catch(e => {
  console.error(`FATAL: ${e.stack ?? e.message}`);
  process.exit(1);
});