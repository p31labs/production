#!/usr/bin/env node
/**
 * cross-target-parity.mjs — Lane C-3 (v2.0) cross-target parity gate.
 *
 *   node cross-target-parity.mjs [--dist <dir>] [--sources <dir>]
 *
 * Asserts (read-only):
 *   (1) every token name emitted by Lane A — css-full/tokens.css,
 *       css-mobile/tokens.mobile.css, embedded/tokens.min.css,
 *       js/tokens.mjs, tokens.manifest.json — exists in the merged source
 *       AND is live (a $deprecated token leaking into dist = parity failure).
 *       CSS var names must be derivable from a live merged-source name via
 *       the emitter's cssVarName transform (--p31-<name>, dots→hyphens).
 *       Parity is bidirectional: the FULL targets (css-full, js/tokens.mjs,
 *       manifest) must be complete — every live emission token present —
 *       while css-mobile/embedded are tier subsets (no stray vars only).
 *   (2) every P31_COLOR_* define in D-embedded/dist/p31_theme.h maps via
 *       D-embedded/color-map.json (colors[]) to a merged-source token path,
 *       and that token is live (mapping to a $deprecated token = failure,
 *       same fail-closed rule the D generator enforces).
 *   (3) the header's P31_SPACE_ and P31_RADIUS_ defines correspond, via
 *       color-map.json (spacing[]/radius[]), to merged-source token names.
 *
 * Exit 0 = no findings; exit 1 = any finding (fail closed). Zero deps.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const CANON_PATH = "/home/p31/production/packages/canon/tokens/tokens.dtc.json";
const SUPPLEMENT_PATH = "/home/p31/production/design-workflow/A-token-pipeline/supplement.tokens.json";
const BREAKPOINTS_PATH = "/home/p31/production/design-workflow/B-device-tiers/breakpoints.tokens.json";
const A_DIST = "/home/p31/production/design-workflow/A-token-pipeline/dist";
const D_HEADER = "/home/p31/production/design-workflow/D-embedded/dist/p31_theme.h";
const D_MAP = "/home/p31/production/design-workflow/D-embedded/color-map.json";

function fail(msg) {
  console.error(`❌ cross-target-parity: ${msg}`);
  process.exit(1);
}

// ── CLI ────────────────────────────────────────────────────────────
let distDir = A_DIST;
let sourcesDir = null;
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === "--dist") {
    distDir = process.argv[++i];
    if (!distDir) fail("--dist requires a directory");
  } else if (a === "--sources") {
    sourcesDir = process.argv[++i];
    if (!sourcesDir) fail("--sources requires a directory");
  } else if (a === "--help") {
    console.log("usage: node cross-target-parity.mjs [--dist <dir>] [--sources <dir>]");
    process.exit(0);
  } else {
    fail(`unknown argument: ${a}`);
  }
}

function loadJson(p) {
  if (!existsSync(p)) fail(`missing file: ${p}`);
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch (e) {
    fail(`cannot parse ${p}: ${e.message}`);
  }
}

const canonPath = sourcesDir ? join(sourcesDir, "tokens.dtc.json") : CANON_PATH;
const supplementPath = sourcesDir ? join(sourcesDir, "supplement.tokens.json") : SUPPLEMENT_PATH;
const breakpointsPath = sourcesDir ? join(sourcesDir, "breakpoints.tokens.json") : BREAKPOINTS_PATH;
const canon = loadJson(canonPath);
const supplement = loadJson(supplementPath);
const breakpoints = loadJson(breakpointsPath);
const colorMap = loadJson(D_MAP);
if (!existsSync(D_HEADER)) fail(`missing header: ${D_HEADER}`);
const headerSrc = readFileSync(D_HEADER, "utf8");

// ── Merged source (canon wins; supplement, then breakpoints, add missing) ──
function flatten(node, path, out) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;
  for (const key of Object.keys(node)) {
    if (key.startsWith("$")) continue;
    const p = path ? `${path}.${key}` : key;
    const v = node[key];
    if (v && typeof v === "object" && !Array.isArray(v) && "$value" in v) out.push([p, v]);
    else flatten(v, p, out);
  }
}

const merged = new Map();
{
  const acc = [];
  for (const key of Object.keys(canon)) {
    if (key.startsWith("$")) continue;
    flatten({ [key]: canon[key] }, "", acc);
  }
  for (const [name, tok] of acc) merged.set(name, tok);
}
{
  const acc = [];
  flatten(supplement, "", acc);
  for (const [name, tok] of acc) if (!merged.has(name)) merged.set(name, tok);
}
{
  const acc = [];
  flatten(breakpoints, "", acc);
  for (const [name, tok] of acc) if (!merged.has(name)) merged.set(name, tok);
}

// Emission namespace = merged minus $deprecated, minus tier-excluded groups
// (same as tier-emitter.mjs; themes.*/component.* never appear in A dist).
const emissionNames = [...merged.entries()]
  .filter(([name, tok]) => !tok.$deprecated && !name.startsWith("themes.") && !name.startsWith("component."))
  .map(([name]) => name);

const cssVarName = (name) =>
  "--p31-" + (name.startsWith("p31.") ? name.slice(4) : name).replace(/\./g, "-");
const liveVars = new Set(emissionNames.map(cssVarName));

// ── Findings ───────────────────────────────────────────────────────
const findings = [];

// (1) Lane A dist: CSS targets
// css-full is a FULL emission (completeness: every live emission var present);
// css-mobile / embedded are tier subsets (no stray vars, presence optional).
const cssFiles = [
  { path: join(distDir, "css-full", "tokens.css"), full: true },
  { path: join(distDir, "css-mobile", "tokens.mobile.css"), full: false },
  { path: join(distDir, "embedded", "tokens.min.css"), full: false },
];
const VAR_RE = /(--p31-[a-zA-Z0-9_-]+)\s*:/g;
for (const { path: f, full } of cssFiles) {
  if (!existsSync(f)) {
    findings.push(`${f} — missing dist artifact`);
    continue;
  }
  const src = readFileSync(f, "utf8");
  const found = new Set();
  for (const m of src.matchAll(VAR_RE)) {
    const vn = m[1];
    if (found.has(vn)) continue;
    found.add(vn);
    if (!liveVars.has(vn)) findings.push(`${f} — CSS var ${vn} not derivable from a live merged-source token`);
  }
  if (full) {
    for (const vn of liveVars) {
      if (!found.has(vn)) findings.push(`${f} — missing emitted CSS var ${vn} (full target incomplete)`);
    }
  }
}

// (1) Lane A dist: manifest (full target — completeness both directions)
const manifestPath = join(distDir, "tokens.manifest.json");
if (!existsSync(manifestPath)) {
  findings.push(`${manifestPath} — missing dist artifact`);
} else {
  const manifest = loadJson(manifestPath);
  const manifestNames = new Set(Object.keys(manifest.tokens ?? {}));
  for (const name of manifestNames) {
    const tok = merged.get(name);
    if (!tok) findings.push(`${manifestPath} — token ${name} not in merged source`);
    else if (tok.$deprecated) findings.push(`${manifestPath} — token ${name} is $deprecated in source`);
  }
  for (const name of emissionNames) {
    if (!manifestNames.has(name)) findings.push(`${manifestPath} — missing emitted token ${name} (manifest incomplete)`);
  }
}

// (1) Lane A dist: js
function extractJson(src, anchor) {
  const start = src.indexOf(anchor);
  if (start < 0) return null;
  const open = src.indexOf("{", start + anchor.length);
  if (open < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(src.slice(open, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

const jsPath = join(distDir, "js", "tokens.mjs");
if (!existsSync(jsPath)) {
  findings.push(`${jsPath} — missing dist artifact`);
} else {
  const src = readFileSync(jsPath, "utf8");
  const tokensObj = extractJson(src, "export const tokens =");
  const cssVarsObj = extractJson(src, "export const cssVars =");
  if (!tokensObj) findings.push(`${jsPath} — could not parse tokens export`);
  else {
    const jsNames = new Set(Object.keys(tokensObj));
    for (const name of jsNames) {
      const tok = merged.get(name);
      if (!tok) findings.push(`${jsPath} — tokens export key ${name} not in merged source`);
      else if (tok.$deprecated) findings.push(`${jsPath} — tokens export key ${name} is $deprecated in source`);
    }
    for (const name of emissionNames) {
      if (!jsNames.has(name)) findings.push(`${jsPath} — missing emitted token ${name} (tokens export incomplete)`);
    }
  }
  if (!cssVarsObj) findings.push(`${jsPath} — could not parse cssVars export`);
  else {
    const jsVarKeys = new Set(Object.keys(cssVarsObj));
    for (const vn of jsVarKeys) {
      if (!liveVars.has(vn)) findings.push(`${jsPath} — cssVars key ${vn} not derivable from a live merged-source token`);
    }
    for (const vn of liveVars) {
      if (!jsVarKeys.has(vn)) findings.push(`${jsPath} — missing cssVar ${vn} (cssVars export incomplete)`);
    }
  }
}

// (2)+(3) LVGL header defines ↔ color-map.json ↔ merged source
const DEF_RE = /#define\s+(P31_(?:COLOR|SPACE|RADIUS)_[A-Z0-9_]+)/g;
const headerDefs = [];
for (const m of headerSrc.matchAll(DEF_RE)) headerDefs.push(m[1]);
if (headerDefs.length === 0) findings.push(`${D_HEADER} — no P31_COLOR_*/P31_SPACE_*/P31_RADIUS_* defines found`);

for (const def of headerDefs) {
  const section = def.startsWith("P31_COLOR_") ? "colors" : def.startsWith("P31_SPACE_") ? "spacing" : "radius";
  const entry = (colorMap[section] ?? []).find((e) => e.define === def);
  if (!entry) {
    findings.push(`${D_HEADER} — define ${def} has no entry in ${D_MAP} ${section}[]`);
    continue;
  }
  const token = entry.token;
  const tok = merged.get(token);
  if (!tok) {
    findings.push(`${D_HEADER} — define ${def} maps to ${token}, not a merged-source token path`);
    continue;
  }
  if (tok.$deprecated) findings.push(`${D_HEADER} — define ${def} maps to deprecated token ${token}`);
}

// ── Report ─────────────────────────────────────────────────────────
console.log("— Cross-target parity (C-3) —");
console.log(`  merged source: ${merged.size} names; live emission namespace: ${emissionNames.length} names`);
console.log(`  Lane A dist: 5 targets checked ← ${distDir}`);
console.log(`  LVGL header: ${headerDefs.length} P31_ defines checked ← ${D_HEADER}`);
console.log(`  color map: ${colorMap.colors.length} colors, ${colorMap.spacing.length} spacing, ${colorMap.radius.length} radius ← ${D_MAP}`);
console.log(`  findings: ${findings.length}`);
for (const fd of findings) console.log(`  FINDING ${fd}`);
console.log(findings.length === 0 ? "\nRESULT: PASS (cross-target parity OK)" : "\nRESULT: FAIL (fail closed)");
process.exit(findings.length === 0 ? 0 : 1);