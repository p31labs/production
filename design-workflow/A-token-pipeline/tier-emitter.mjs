#!/usr/bin/env node
/**
 * tier-emitter.mjs — Lane A token tier emitter (native Node ESM, ZERO dependencies).
 *
 *   node tier-emitter.mjs [--target all|css-full|css-mobile|embedded|js]   (default: all)
 *
 * Reads the canon DTCG source of truth + this lane's supplement.tokens.json and
 * deep-merges them: the supplement wins ONLY for names canon lacks (canon wins
 * on collisions). Emits, into ./dist/:
 *
 *   dist/css-full/tokens.css        every live token  --p31-<name>: <value>;
 *                                   alias refs preserved as var(--p31-...)
 *   dist/css-mobile/tokens.mobile.css  mobileCritical subset (tier-config.json)
 *   dist/embedded/tokens.min.css    embedded subset, minified single line
 *   dist/js/tokens.mjs              ESM export of the resolved token map
 *   dist/tokens.manifest.json       name→value map (parity gate input)
 *
 * Emission namespace: merged map MINUS themes.* (theme-pack overrides — canon's
 * own compiler emits theme-{id}.css), MINUS component (empty), MINUS $deprecated
 * tokens (121 in canon; design-core AGENTS.md mistake #6 forbids live consumers
 * of deprecated tokens). See delta-table.md §7–8.
 *
 * Exit 1 (fail closed) on:
 *   - unresolved alias reference {name}
 *   - token without $type
 *   - unknown --target
 *   - tier-config referencing a name not in the emission namespace
 *   - two source tokens mapping to one CSS var name with DIFFERENT values
 *     (canon's flat/nested duplicates are deduped only when byte-identical)
 *
 * NOT Style Dictionary (see sd-v4-note.md for the recorded decision + v4 path).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const LANE = dirname(fileURLToPath(import.meta.url));
const CANON_PATH = "/home/p31/production/packages/canon/tokens/tokens.dtc.json";
const SUPPLEMENT_PATH = join(LANE, "supplement.tokens.json");
// Breakpoints are the canonical B-lane source (ONE SOURCE, runbook Law 1):
// consumed as a supplement — canon wins for names it already defines.
// ABSOLUTE path so the emitter also runs inside the .neg-tmp negative-control copy.
const BREAKPOINTS_PATH = "/home/p31/production/design-workflow/B-device-tiers/breakpoints.tokens.json";
const TIER_CONFIG_PATH = join(LANE, "tier-config.json");
const DIST = join(LANE, "dist");

const EXCLUDED_TOP = new Set(["themes", "component"]); // theme packs + empty array
const VALID_TARGETS = new Set(["all", "css-full", "css-mobile", "embedded", "js"]);

function fail(msg) {
  console.error(`❌ tier-emitter: ${msg}`);
  process.exit(1);
}

// ── CLI ────────────────────────────────────────────────────────────
let target = "all";
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--target") {
    target = args[i + 1];
    if (!target) fail("--target requires a value");
    i++;
  } else if (args[i].startsWith("--target=")) {
    target = args[i].slice("--target=".length);
  } else {
    fail(`unknown argument: ${args[i]}`);
  }
}
if (!VALID_TARGETS.has(target)) {
  fail(`unknown --target: ${target} (expected: ${[...VALID_TARGETS].join("|")})`);
}

// ── Load sources ──────────────────────────────────────────────────
let canon, supplement, breakpoints;
try {
  canon = JSON.parse(readFileSync(CANON_PATH, "utf8"));
} catch (e) {
  fail(`cannot read canon ${CANON_PATH}: ${e.message}`);
}
try {
  supplement = JSON.parse(readFileSync(SUPPLEMENT_PATH, "utf8"));
} catch (e) {
  fail(`cannot read supplement ${SUPPLEMENT_PATH}: ${e.message}`);
}
try {
  breakpoints = JSON.parse(readFileSync(BREAKPOINTS_PATH, "utf8"));
} catch (e) {
  fail(`cannot read breakpoints ${BREAKPOINTS_PATH}: ${e.message}`);
}

// ── Flatten + deep merge ──────────────────────────────────────────
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

const merged = new Map(); // dotted name -> token object
let suppAdded = 0;
let suppSkipped = 0;
for (const key of Object.keys(canon)) {
  if (key.startsWith("$") || EXCLUDED_TOP.has(key)) continue;
  for (const [name, tok] of (() => { const acc = []; flatten({ [key]: canon[key] }, "", acc); return acc; })()) {
    merged.set(name, tok);
  }
}
for (const [name, tok] of (() => { const acc = []; flatten(supplement, "", acc); return acc; })()) {
  if (merged.has(name)) {
    suppSkipped++; // canon wins — supplement only fills names canon lacks
    continue;
  }
  merged.set(name, tok);
  suppAdded++;
}
for (const [name, tok] of (() => { const acc = []; flatten(breakpoints, "", acc); return acc; })()) {
  if (merged.has(name)) {
    suppSkipped++; // canon/supplement wins over breakpoints on name collision
    continue;
  }
  merged.set(name, tok);
  suppAdded++;
}

// ── Gate: every merged token has $type ────────────────────────────
for (const [name, tok] of merged) {
  if (!tok.$type || typeof tok.$type !== "string") fail(`token without $type: ${name}`);
}

// ── Emission namespace (non-deprecated) ───────────────────────────
const EMIT = new Map();
for (const [name, tok] of merged) if (!tok.$deprecated) EMIT.set(name, tok);
const deprecatedSkipped = merged.size - EMIT.size;

// ── CSS var naming + serialization + alias resolution ─────────────
const cssVarName = (name) =>
  "--p31-" + (name.startsWith("p31.") ? name.slice(4) : name).replace(/\./g, "-");

function resolveRef(ref, fromName) {
  if (EMIT.has(ref)) return ref;
  const fromParts = fromName.split(".");
  for (let i = fromParts.length - 2; i >= 0; i--) {
    const candidate = fromParts.slice(0, i + 1).concat(ref.split(".")).join(".");
    if (EMIT.has(candidate)) return candidate;
  }
  fail(`unresolved alias reference {${ref}} in token ${fromName}`);
}

function serialize(name, tok, forCss = false) {
  // CSS output prefers $extensions.remValue (breakpoints → rem, runbook B-3);
  // JS/manifest keep the raw $value.
  if (forCss && tok.$extensions && typeof tok.$extensions.remValue === "string") {
    return tok.$extensions.remValue;
  }
  const raw = tok.$value;
  const t = tok.$type;
  if (typeof raw === "string") {
    return raw.replace(/\{([^{}]+)\}/g, (_m, ref) => `var(${cssVarName(resolveRef(ref, name))})`);
  }
  if (typeof raw === "number") return String(raw);
  if (Array.isArray(raw)) {
    if (t === "cubicBezier") return `cubic-bezier(${raw.map(String).join(", ")})`;
    return raw
      .map((s) => (typeof s === "string" && /\s/.test(s) && !/^["']/.test(s) ? `"${s}"` : String(s)))
      .join(", ");
  }
  if (raw && typeof raw === "object") {
    if ("colorSpace" in raw) {
      const [l, c, h] = raw.components;
      const core = `oklch(${l} ${c} ${h}`;
      return raw.alpha != null ? `${core} / ${raw.alpha})` : `${core})`;
    }
    if ("value" in raw && "unit" in raw) return `${raw.value}${raw.unit}`;
    fail(`unsupported $value shape in token ${name}: ${JSON.stringify(raw)}`);
  }
  fail(`unsupported $value type in token ${name}: ${typeof raw}`);
}

// One CSS var name per declaration; duplicates allowed only if byte-identical.
function declarations(names) {
  const out = new Map(); // cssVar -> {value, first}
  for (const name of names) {
    if (!EMIT.has(name)) fail(`tier references unknown token: ${name}`);
    const value = serialize(name, EMIT.get(name), true);
    const vn = cssVarName(name);
    const existing = out.get(vn);
    if (existing) {
      if (existing.value !== value) {
        fail(`CSS var collision with differing values: ${vn} (${existing.first} vs ${name})`);
      }
      continue; // identical flat/nested duplicate — dedupe
    }
    out.set(vn, { value, first: name });
  }
  return out;
}

const HEADER = (relPath) =>
  `/* GENERATED by tier-emitter.mjs — DO NOT EDIT.\n` +
  `   source: ${CANON_PATH}\n` +
  `   supplement: ${SUPPLEMENT_PATH} (merged: +${suppAdded} added, ${suppSkipped} skipped — canon wins)\n` +
  `   emission namespace: ${EMIT.size} live tokens (${deprecatedSkipped} deprecated skipped, themes.* excluded)\n` +
  `   target: ${relPath} */\n`;

function writeCss(relPath, names, minified = false) {
  const decls = declarations(names);
  let out;
  if (minified) {
    out = ":root{";
    for (const [vn, { value }] of decls) out += `${vn}:${value};`;
    out += "}";
  } else {
    out = HEADER(relPath) + ":root {\n";
    for (const [vn, { value }] of decls) out += `  ${vn}: ${value};\n`;
    out += "}\n";
  }
  writeFileSync(join(DIST, relPath), out);
}

function writeJs() {
  const tokens = {};
  const cssVars = {};
  for (const name of [...EMIT.keys()].sort()) {
    const value = serialize(name, EMIT.get(name));
    tokens[name] = value;
    const vn = cssVarName(name);
    if (!(vn in cssVars)) cssVars[vn] = value;
  }
  const out =
    `// GENERATED by tier-emitter.mjs — DO NOT EDIT\n` +
    `// Resolved token map: dotted source name → CSS value (alias refs → var(--p31-...)).\n` +
    `export const tokens = ${JSON.stringify(tokens, null, 2)};\n\n` +
    `export const cssVars = ${JSON.stringify(cssVars, null, 2)};\n\n` +
    `export default { tokens, cssVars };\n`;
  writeFileSync(join(DIST, "js", "tokens.mjs"), out);
}

function writeManifest() {
  const map = {};
  for (const name of [...EMIT.keys()].sort()) map[name] = serialize(name, EMIT.get(name));
  const doc = {
    generatedBy: "tier-emitter.mjs (Lane A)",
    canon: CANON_PATH,
    supplement: "supplement.tokens.json",
    mergeRule: "supplement adds only names canon lacks",
    totalMerged: merged.size,
    emitted: EMIT.size,
    deprecatedSkipped,
    themePacksExcluded: true,
    tokens: map,
  };
  writeFileSync(join(DIST, "tokens.manifest.json"), JSON.stringify(doc, null, 2) + "\n");
}

// ── Emit per target ───────────────────────────────────────────────
mkdirSync(DIST, { recursive: true });

function tierTokens(tierName) {
  let cfg;
  try {
    cfg = JSON.parse(readFileSync(TIER_CONFIG_PATH, "utf8"));
  } catch (e) {
    fail(`cannot read tier config ${TIER_CONFIG_PATH}: ${e.message}`);
  }
  const list = cfg.tiers?.[tierName]?.tokens;
  if (!Array.isArray(list) || list.length === 0) {
    fail(`tier config has no non-empty tokens list for "${tierName}"`);
  }
  return list;
}

const needsTierConfig = target === "all" || target === "css-mobile" || target === "embedded";
if (needsTierConfig) tierTokens("mobileCritical"); // validate file shape up front

const built = [];
if (target === "all" || target === "css-full") {
  mkdirSync(join(DIST, "css-full"), { recursive: true });
  writeCss(join("css-full", "tokens.css"), [...EMIT.keys()]);
  built.push("dist/css-full/tokens.css");
}
if (target === "all" || target === "css-mobile") {
  mkdirSync(join(DIST, "css-mobile"), { recursive: true });
  writeCss(join("css-mobile", "tokens.mobile.css"), tierTokens("mobileCritical"));
  built.push("dist/css-mobile/tokens.mobile.css");
}
if (target === "all" || target === "embedded") {
  mkdirSync(join(DIST, "embedded"), { recursive: true });
  writeCss(join("embedded", "tokens.min.css"), tierTokens("embedded"), true);
  built.push("dist/embedded/tokens.min.css");
}
if (target === "all" || target === "js") {
  mkdirSync(join(DIST, "js"), { recursive: true });
  writeJs();
  built.push("dist/js/tokens.mjs");
}
if (target === "all" || target === "js") {
  writeManifest();
  built.push("dist/tokens.manifest.json");
}

console.error(
  `tier-emitter: merged ${merged.size} tokens (supplement +${suppAdded}, canon-wins skip ${suppSkipped}); ` +
    `emitted ${EMIT.size} live (${deprecatedSkipped} deprecated skipped); built: ${built.join(", ")}`,
);
console.log(built.join("\n"));