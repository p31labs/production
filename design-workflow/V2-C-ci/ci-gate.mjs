#!/usr/bin/env node
/**
 * ci-gate.mjs — Lane C-1 (v2.0) aggregate CI gate for the design workflow.
 *
 *   node ci-gate.mjs [--expect-fail] [--sources <dir>] [--dist <dir>]
 *
 * Runs, in order (each must exit 0; any failure → this script exits 1):
 *   (a) ../run-all-gates.mjs         — v1.0 aggregate runner (lanes A–D,
 *       7+ gates, incl. its own inline negative controls)
 *   (b) ./dtcg-shape-audit.mjs       — C-2 canon-level DTCG shape audit
 *   (c) ./cross-target-parity.mjs    — C-3 cross-target parity (A dist + LVGL)
 *
 * This is the script proposed to slot into the portal's `pnpm gate` chain
 * (see wire-proposal.md — PENDING EXPLICIT HUMAN OVERRIDE, RB-SPINE-001).
 *
 * Negative controls (P31 doctrine: a gate that cannot fail is furniture):
 *   (i)  planted broken token: `node ci-gate.mjs --sources <sabotaged-dir>`
 *        → C-2 audit finds the unresolved alias → exit 1 (demonstrated).
 *   (ii) `--expect-fail` inverts every gate's expectation (a gate must exit
 *        non-zero to count as PASS). On a healthy system every gate exits 0,
 *        so the runner itself must report FAIL and exit 1 — proving the
 *        runner's fail machinery works even when the system is green
 *        (demonstrated once).
 *
 * Zero deps. Node 24 ESM.
 */
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url)); // V2-C-ci/
const WF = dirname(ROOT); // design-workflow/
const AGGREGATE = join(WF, "run-all-gates.mjs");
const C2_AUDIT = join(ROOT, "dtcg-shape-audit.mjs");
const C3_PARITY = join(ROOT, "cross-target-parity.mjs");

// ── CLI ────────────────────────────────────────────────────────────
let expectFail = false;
let sourcesDir = null;
let distDir = null;
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === "--expect-fail") expectFail = true;
  else if (a === "--sources") {
    sourcesDir = process.argv[++i];
    if (!sourcesDir) {
      console.error("ci-gate: --sources requires a directory");
      process.exit(2);
    }
  } else if (a === "--dist") {
    distDir = process.argv[++i];
    if (!distDir) {
      console.error("ci-gate: --dist requires a directory");
      process.exit(2);
    }
  } else if (a === "--help") {
    console.log("usage: node ci-gate.mjs [--expect-fail] [--sources <dir>] [--dist <dir>]");
    process.exit(0);
  } else {
    console.error(`ci-gate: unknown argument: ${a}`);
    process.exit(2);
  }
}
// Absolutize overrides against the invocation cwd — children run with
// cwd = design-workflow/, so relative paths would misresolve.
if (sourcesDir) sourcesDir = resolve(sourcesDir);
if (distDir) distDir = resolve(distDir);

// ── Runner ─────────────────────────────────────────────────────────
const gates = [];
let failures = 0;

function run(label, script, args) {
  let exit = 0;
  let out = "";
  try {
    out = execFileSync(process.execPath, [script, ...args], {
      cwd: WF,
      encoding: "utf8",
      timeout: 180_000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    exit = e.status ?? 1;
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
  const ok = expectFail ? exit !== 0 : exit === 0;
  const status = ok ? "PASS" : "FAIL";
  if (!ok) failures++;
  const tail = out.trim().split("\n").slice(-6).join("\n");
  console.log(`${status.padEnd(4)} ${label}  (exit ${exit}; expected ${expectFail ? "non-zero (--expect-fail)" : "0"})`);
  if (tail) {
    const lines = (ok ? out.trim().split("\n").slice(-2) : out.trim().split("\n").slice(-6)).join("\n");
    console.log(lines.split("\n").map((l) => `      ${l}`).join("\n"));
  }
  gates.push({ label, status, exit });
  return { exit, out };
}

console.log("═══ P31 V2-C-ci aggregate CI gate (Lane C v2.0) ═══");
if (expectFail) console.log("   MODE: --expect-fail — expectations INVERTED (sabotage check: each gate must FAIL to pass)");
console.log();

run("C-1 v1.0 aggregate runner (lanes A–D)", AGGREGATE, []);
run("C-2 DTCG shape audit", C2_AUDIT, sourcesDir ? ["--sources", sourcesDir] : []);
run(
  "C-3 cross-target parity",
  C3_PARITY,
  [...(distDir ? ["--dist", distDir] : []), ...(sourcesDir ? ["--sources", sourcesDir] : [])],
);

// ── Summary ────────────────────────────────────────────────────────
console.log("\n— CI GATE SUMMARY —");
for (const g of gates) console.log(`${g.status.padEnd(4)} ${g.label}  (exit ${g.exit})`);
const result = failures === 0 ? "ALL CI GATES PASS" : `${failures} CI GATE(S) FAILED`;
console.log(`\nRESULT: ${result}`);
process.exit(failures === 0 ? 0 : 1);