#!/usr/bin/env node
/**
 * lh-budget.mjs — the p31ca Lighthouse performance budget gate.
 *
 * Zero-dependency plain Node. One source of truth for the budgets lives in
 * `lighthouserc.json` (the Lighthouse CI assertions at the repo root); this
 * script holds the same numbers and refuses to run if the two drift, so the
 * CI config and the local gate can never disagree silently.
 *
 * Modes:
 *   1. `node scripts/lh-budget.mjs --json <report.json>`
 *      Evaluate an existing Lighthouse report (CLI `--output=json` file, the
 *      `{ lhr: ... }` node-API shape, or a JSON array of runs). Pure budget
 *      math, no network, no browser. Fails on any over-budget metric.
 *   2. `node scripts/lh-budget.mjs [--url https://p31ca.org]`
 *      If a locally installed Lighthouse CLI is present (node_modules), run
 *      it once against the URL and evaluate the result. Honors CHROME_PATH.
 *   3. No CLI and no --json → exit 2 with the exact command to produce a
 *      report, so the gate chain can hand off to a CI run.
 *
 * Exit codes: 0 = all measured metrics within budget, 1 = over budget,
 * 2 = nothing to measure (no report, no CLI).
 *
 * INP note: `interaction-to-next-paint` only exists in timespan/user-flow
 * reports, never in a navigation run — when absent it is reported as
 * "not measured" and does not fail the gate.
 */

import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Canonical budgets (ms; CLS and score unitless). Mirrors lighthouserc.json. */
const BUDGETS = {
  fcp: { label: 'FCP', maxMs: 1800, audit: 'first-contentful-paint' },
  lcp: { label: 'LCP', maxMs: 2500, audit: 'largest-contentful-paint' },
  ttfb: { label: 'TTFB', maxMs: 800, audit: 'server-response-time' },
  tbt: { label: 'TBT', maxMs: 200, audit: 'total-blocking-time' },
  cls: { label: 'CLS', max: 0.1, audit: 'cumulative-layout-shift' },
  inp: { label: 'INP', maxMs: 200, audit: 'interaction-to-next-paint' },
};
const MIN_PERF_SCORE = 0.9;

function parseArgs(argv) {
  const args = { url: 'https://p31ca.org', json: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--url') args.url = argv[++i];
    else if (argv[i] === '--json') args.json = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') args.help = true;
  }
  return args;
}

/** Assert the rc file's assertions agree with the canonical budgets. */
function assertRcInSync() {
  const rcPath = join(ROOT, 'lighthouserc.json');
  if (!existsSync(rcPath)) {
    console.error('lh-budget: FAIL — lighthouserc.json missing (the CI budget config).');
    process.exit(1);
  }
  let rc;
  try {
    rc = JSON.parse(readFileSync(rcPath, 'utf8'));
  } catch (e) {
    console.error(`lh-budget: FAIL — lighthouserc.json is not valid JSON (${e.message}).`);
    process.exit(1);
  }
  const assertions = rc?.ci?.assert?.assertions ?? {};
  const problems = [];
  if (!Array.isArray(assertions['categories:performance']) || assertions['categories:performance'][1]?.minScore !== MIN_PERF_SCORE) {
    problems.push(`categories:performance minScore !== ${MIN_PERF_SCORE}`);
  }
  for (const key of Object.keys(BUDGETS)) {
    // INP is field/timespan-only: Lighthouse CI navigation runs never emit
    // `interaction-to-next-paint`, so it lives in this script's budgets only
    // and is judged whenever a timespan report is actually provided.
    if (key === 'inp') continue;
    const a = assertions[BUDGETS[key].audit];
    const want = key === 'cls' ? { maxNumericValue: BUDGETS.cls.max } : { maxNumericValue: BUDGETS[key].maxMs };
    if (!Array.isArray(a) || a[1]?.maxNumericValue !== want.maxNumericValue) {
      problems.push(`${BUDGETS[key].audit} maxNumericValue !== ${want.maxNumericValue}`);
    }
  }
  if (problems.length) {
    console.error('lh-budget: FAIL — lighthouserc.json drifted from the canonical budgets:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
}

/** Normalize any Lighthouse report shape into a list of LHR objects. */
function toLhrs(data) {
  if (Array.isArray(data)) return data;
  if (data?.lhr) return [data.lhr];
  if (data?.audits && data?.categories) return [data];
  return [];
}

/** Evaluate one LHR. Returns { rows, failures, measuredAny }. */
function evaluate(lhr) {
  const rows = [];
  let failures = 0;
  let measuredAny = false;
  for (const key of Object.keys(BUDGETS)) {
    const b = BUDGETS[key];
    const audit = lhr?.audits?.[b.audit];
    if (!audit || typeof audit.numericValue !== 'number') {
      rows.push({ key, label: b.label, budget: fmtBudget(key, b), value: 'not measured', pass: null });
      continue;
    }
    measuredAny = true;
    const value = audit.numericValue;
    const limit = key === 'cls' ? b.max : b.maxMs;
    const pass = value <= limit;
    if (!pass) failures++;
    rows.push({ key, label: b.label, budget: fmtBudget(key, b), value: key === 'cls' ? value.toFixed(3) : `${Math.round(value)} ms`, pass });
  }
  const score = lhr?.categories?.performance?.score;
  if (typeof score === 'number') {
    const pass = score >= MIN_PERF_SCORE;
    if (!pass) failures++;
    rows.push({ key: 'score', label: 'Performance score', budget: `>= ${MIN_PERF_SCORE}`, value: score.toFixed(2), pass });
  }
  return { rows, failures, measuredAny };
}

function fmtBudget(key, b) {
  return key === 'cls' ? `<= ${b.max}` : `<= ${b.maxMs} ms`;
}

function printTable(rows, source) {
  console.log(`lh-budget: evaluating ${source}`);
  for (const r of rows) {
    const status = r.pass === null ? '—' : r.pass ? 'PASS' : 'FAIL';
    console.log(`  ${r.label.padEnd(18)} budget ${String(r.budget).padEnd(12)} measured ${String(r.value).padEnd(12)} ${status}`);
  }
}

/** Find a locally installed Lighthouse CLI, if any. Prefer the package's JS
 *  entry (pnpm .bin shims are shell scripts that `node` cannot execute). */
function findLighthouseCli() {
  const pkgs = [
    join(ROOT, 'node_modules', 'lighthouse'),
    join(ROOT, '..', '..', 'node_modules', 'lighthouse'),
  ];
  for (const p of pkgs) {
    if (existsSync(join(p, 'cli', 'index.js'))) return join(p, 'cli', 'index.js');
  }
  const bins = [
    join(ROOT, 'node_modules', '.bin', 'lighthouse'),
    join(ROOT, '..', '..', 'node_modules', '.bin', 'lighthouse'),
    join(ROOT, '..', 'node_modules', '.bin', 'lighthouse'),
  ];
  for (const b of bins) {
    if (!existsSync(b)) continue;
    try {
      if (!readFileSync(b, 'utf8').startsWith('#!')) return b;
    } catch {
      /* unreadable — skip */
    }
  }
  return null;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log('usage: node scripts/lh-budget.mjs [--url URL] [--json report.json]');
  process.exit(0);
}
assertRcInSync();

// Mode 1 — evaluate a report file already on disk.
if (args.json) {
  if (!existsSync(args.json)) {
    console.error(`lh-budget: FAIL — ${args.json} does not exist.`);
    process.exit(1);
  }
  let data;
  try {
    data = JSON.parse(readFileSync(args.json, 'utf8'));
  } catch (e) {
    console.error(`lh-budget: FAIL — ${args.json} is not valid JSON (${e.message}).`);
    process.exit(1);
  }
  const lhrs = toLhrs(data);
  if (!lhrs.length) {
    console.error('lh-budget: FAIL — the JSON does not look like a Lighthouse report (no audits/categories).');
    process.exit(1);
  }
  let failures = 0;
  let measuredAny = false;
  lhrs.forEach((lhr, i) => {
    const r = evaluate(lhr);
    printTable(r.rows, lhrs.length > 1 ? `run ${i + 1}/${lhrs.length} (${args.json})` : args.json);
    failures += r.failures;
    measuredAny = measuredAny || r.measuredAny;
  });
  if (!measuredAny) {
    console.error('lh-budget: no metric could be measured from this report.');
    process.exit(2);
  }
  if (failures > 0) {
    console.error(`lh-budget: FAIL — ${failures} metric(s) over budget.`);
    process.exit(1);
  }
  console.log('lh-budget: PASS — all measured metrics within budget.');
  process.exit(0);
}

// Mode 2 — run the locally installed CLI, if present.
const cli = findLighthouseCli();
if (!cli) {
  console.error('lh-budget: no Lighthouse CLI installed and no --json report given.');
  console.error('Produce a report (CI or a dev box with Lighthouse) and re-run:');
  console.error(`  npx lighthouse ${args.url} --output=json --output-path=.lh/report.json --chrome-flags="--headless=new --no-sandbox"`);
  console.error('  node scripts/lh-budget.mjs --json .lh/report.json');
  process.exit(2);
}

const outPath = join(tmpdir(), `p31ca-lh-${Date.now()}.json`);
const chromeFlags = '--headless=new --no-sandbox --disable-gpu';
console.log(`lh-budget: running Lighthouse (${cli}) against ${args.url} ...`);
const res = spawnSync('node', [cli, args.url, '--output=json', `--output-path=${outPath}`, '--quiet', '--preset=desktop', `--chrome-flags=${chromeFlags}`], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, CHROME_PATH: process.env.CHROME_PATH || '' },
  timeout: 180_000,
});
if (res.status !== 0 || !existsSync(outPath)) {
  console.error(`lh-budget: FAIL — Lighthouse run failed (exit ${res.status}).`);
  if (res.stderr) console.error(String(res.stderr).slice(0, 2000));
  process.exit(2);
}
const lhrs = toLhrs(JSON.parse(readFileSync(outPath, 'utf8')));
let failures = 0;
let measuredAny = false;
lhrs.forEach((lhr) => {
  const r = evaluate(lhr);
  printTable(r.rows, args.url);
  failures += r.failures;
  measuredAny = measuredAny || r.measuredAny;
});
if (!measuredAny) {
  console.error('lh-budget: no metric could be measured from this run.');
  process.exit(2);
}
if (failures > 0) {
  console.error(`lh-budget: FAIL — ${failures} metric(s) over budget.`);
  process.exit(1);
}
console.log('lh-budget: PASS — all measured metrics within budget.');
process.exit(0);