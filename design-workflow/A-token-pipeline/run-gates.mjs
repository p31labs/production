#!/usr/bin/env node
/**
 * run-gates.mjs — Lane A gate runner. Zero dependencies, Node ESM only.
 *
 *   node run-gates.mjs
 *
 * Gates (each prints PASS/FAIL and evidence):
 *   (a) build succeeds for all targets (all + each individual --target)
 *   (b) every dist artifact exists and is non-empty
 *   (c) PARITY: every token name emitted (manifest) is present in the merged source
 *   (d) embedded gz size (node:zlib gzipSync) < 2048 bytes
 *   (e) NEGATIVE CONTROLS — each MUST exit non-zero, output captured and shown:
 *         (i)  planted unresolved alias in a temp supplement copy
 *         (ii) unknown --target
 *         (iii) token without $type (bonus)
 *
 * Fails closed: any FAIL → exit 1. A gate that cannot fail is furniture (P31 doctrine).
 * Negative controls are INVERTED gates: they PASS when the build exits non-zero.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, existsSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const LANE = dirname(fileURLToPath(import.meta.url));
const CANON_PATH = "/home/p31/production/packages/canon/tokens/tokens.dtc.json";
const SUPPLEMENT_PATH = join(LANE, "supplement.tokens.json");
const BREAKPOINTS_PATH = "/home/p31/production/design-workflow/B-device-tiers/breakpoints.tokens.json";
const EMITTER = join(LANE, "tier-emitter.mjs");
const DIST = join(LANE, "dist");
const NEG_TMP = join(LANE, ".neg-tmp");

const results = [];
let anyFail = false;

function gate(name, pass, evidence) {
  results.push({ name, pass, evidence });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
  if (evidence) console.log(evidence.split("\n").map((l) => `      ${l}`).join("\n"));
  if (!pass) anyFail = true;
}

function runEmitter(args, cwd) {
  const r = spawnSync(process.execPath, [EMITTER, ...args], {
    cwd: cwd ?? LANE,
    encoding: "utf8",
    timeout: 30000,
  });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

// ── Independent re-computation of the merged source (parity gate) ──
function flatten(node, path, out) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;
  for (const key of Object.keys(node)) {
    if (key.startsWith("$")) continue;
    const p = path ? `${path}.${key}` : key;
    const v = node[key];
    if (v && typeof v === "object" && !Array.isArray(v) && "$value" in v) out.add(p);
    else flatten(v, p, out);
  }
}
function mergedSourceNames() {
  const names = new Set();
  const canon = JSON.parse(readFileSync(CANON_PATH, "utf8"));
  const supplement = JSON.parse(readFileSync(SUPPLEMENT_PATH, "utf8"));
  const breakpoints = JSON.parse(readFileSync(BREAKPOINTS_PATH, "utf8"));
  for (const key of Object.keys(canon)) {
    if (key.startsWith("$") || key === "themes" || key === "component") continue;
    flatten({ [key]: canon[key] }, "", names);
  }
  flatten(supplement, "", names);
  flatten(breakpoints, "", names);
  return names;
}

// ── Gate (a): build succeeds for all targets ──────────────────────
console.log("— gate (a): build succeeds for all targets");
{
  const targets = ["all", "css-full", "css-mobile", "embedded", "js"];
  const failures = [];
  for (const t of targets) {
    const r = runEmitter(["--target", t]);
    if (r.status !== 0) failures.push(`--target ${t} exit ${r.status}: ${r.stderr.slice(0, 200)}`);
  }
  gate("a-build-all-targets", failures.length === 0, failures.length ? failures.join("\n") : `all 5 targets exited 0 (${targets.join(", ")})`);
}

// ── Gate (b): every dist file exists and is non-empty ─────────────
console.log("— gate (b): dist artifacts exist and are non-empty");
{
  const files = [
    "css-full/tokens.css",
    "css-mobile/tokens.mobile.css",
    "embedded/tokens.min.css",
    "js/tokens.mjs",
    "tokens.manifest.json",
  ];
  const missing = [];
  for (const f of files) {
    const p = join(DIST, f);
    if (!existsSync(p)) missing.push(`${f}: MISSING`);
    else if (statSync(p).size === 0) missing.push(`${f}: EMPTY`);
  }
  gate("b-dist-artifacts", missing.length === 0, missing.length ? missing.join("\n") : files.map((f) => `${f}: ${statSync(join(DIST, f)).size} B`).join("\n"));
}

// ── Gate (c): PARITY — emitted names ⊆ merged source ──────────────
console.log("— gate (c): parity — every emitted token name present in merged source");
{
  const source = mergedSourceNames();
  const manifest = JSON.parse(readFileSync(join(DIST, "tokens.manifest.json"), "utf8"));
  const emitted = Object.keys(manifest.tokens);
  const stray = emitted.filter((n) => !source.has(n));
  gate("c-token-parity", stray.length === 0 && emitted.length > 0, `merged source: ${source.size} names; manifest emitted: ${emitted.length} names; stray: ${stray.length ? stray.join(", ") : "none"}`);
}

// ── Gate (d): embedded gz < 2048 bytes ────────────────────────────
console.log("— gate (d): embedded gz size budget");
{
  const buf = readFileSync(join(DIST, "embedded", "tokens.min.css"));
  const gz = gzipSync(buf).length;
  gate("d-embedded-gz-budget", gz < 2048, `tokens.min.css raw ${buf.length} B → gzip ${gz} B (budget 2048 B)`);
}

// ── Gate (e): negative controls (inverted gates) ──────────────────
console.log("— gate (e): negative controls — each MUST exit non-zero");
mkdirSync(NEG_TMP, { recursive: true });

function negControl(label, sabotage, expectFail) {
  const tmpDir = join(NEG_TMP, label);
  mkdirSync(tmpDir, { recursive: true });
  copyFileSync(EMITTER, join(tmpDir, "tier-emitter.mjs"));
  const supp = JSON.parse(readFileSync(SUPPLEMENT_PATH, "utf8"));
  sabotage(supp);
  writeFileSync(join(tmpDir, "supplement.tokens.json"), JSON.stringify(supp, null, 2));
  const r = spawnSync(process.execPath, [join(tmpDir, "tier-emitter.mjs"), "--target", "css-full"], {
    cwd: tmpDir,
    encoding: "utf8",
    timeout: 30000,
  });
  const out = `${r.stderr ?? ""}${r.stdout ?? ""}`.trim();
  const capped = out.length > 2000 ? out.slice(0, 2000) + "\n…(truncated)" : out;
  const pass = r.status !== 0;
  if (pass !== expectFail) anyFail = true;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}`);
  console.log(`      exit code: ${r.status}`);
  console.log(capped.split("\n").map((l) => `      ${l}`).join("\n"));
  results.push({ name: label, pass, evidence: `exit code: ${r.status}\n${capped}` });
}

negControl("e-i-unresolved-alias", (s) => {
  s.fluid.space.md.$value = "{nonexistent.token}";
}, true);

// e-ii runs directly against the real emitter (no temp copy needed)
runUnknownTarget();

function runUnknownTarget() {
  const r = runEmitter(["--target", "bogus"]);
  const out = `${r.stderr ?? ""}${r.stdout ?? ""}`.trim();
  const capped = out.length > 2000 ? out.slice(0, 2000) + "\n…(truncated)" : out;
  const pass = r.status !== 0;
  if (!pass) anyFail = true;
  console.log(`${pass ? "PASS" : "FAIL"}  e-ii-unknown-target`);
  console.log(`      exit code: ${r.status}`);
  console.log(capped.split("\n").map((l) => `      ${l}`).join("\n"));
  results.push({ name: "e-ii-unknown-target", pass, evidence: `exit code: ${r.status}\n${capped}` });
}

// bonus negative control: token without $type
{
  const tmpDir = join(NEG_TMP, "e-iii-missing-type");
  mkdirSync(tmpDir, { recursive: true });
  copyFileSync(EMITTER, join(tmpDir, "tier-emitter.mjs"));
  const supp = JSON.parse(readFileSync(SUPPLEMENT_PATH, "utf8"));
  delete supp.fluid.space.lg.$type;
  writeFileSync(join(tmpDir, "supplement.tokens.json"), JSON.stringify(supp, null, 2));
  const r = spawnSync(process.execPath, [join(tmpDir, "tier-emitter.mjs"), "--target", "css-full"], {
    cwd: tmpDir,
    encoding: "utf8",
    timeout: 30000,
  });
  const out = `${r.stderr ?? ""}${r.stdout ?? ""}`.trim();
  const capped = out.length > 2000 ? out.slice(0, 2000) + "\n…(truncated)" : out;
  const pass = r.status !== 0;
  if (!pass) anyFail = true;
  console.log(`${pass ? "PASS" : "FAIL"}  e-iii-missing-type (bonus)`);
  console.log(`      exit code: ${r.status}`);
  console.log(capped.split("\n").map((l) => `      ${l}`).join("\n"));
  results.push({ name: "e-iii-missing-type (bonus)", pass, evidence: `exit code: ${r.status}\n${capped}` });
}

// cleanup negative-control temp dir
rmSync(NEG_TMP, { recursive: true, force: true });

// ── Summary table ─────────────────────────────────────────────────
console.log("\n— GATE SUMMARY —");
for (const r of results) {
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}`);
}
console.log(anyFail ? "\nRESULT: FAIL (a gate failed — fail closed)" : "\nRESULT: ALL GATES PASS");
process.exit(anyFail ? 1 : 0);