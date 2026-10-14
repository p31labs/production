#!/usr/bin/env node
/**
 * dtcg-shape-audit.mjs — Lane C-2 (v2.0) canon-level DTCG 2025.10 shape audit.
 *
 *   node dtcg-shape-audit.mjs [--sources <dir>]
 *
 * Reads (read-only) the three token sources:
 *   canon:       /home/p31/production/packages/canon/tokens/tokens.dtc.json
 *   supplement:  A-token-pipeline/supplement.tokens.json
 *   breakpoints: B-device-tiers/breakpoints.tokens.json
 * `--sources <dir>` overrides all three (negative-control mode): the dir must
 * contain tokens.dtc.json, supplement.tokens.json, breakpoints.tokens.json.
 *
 * Checks, per source file (findings cite <file>:<tokenpath>):
 *   (1) every token has a string $type                        (DTCG shape)
 *   (2) every {alias} reference resolves within the merged namespace —
 *       exact name first, then relative to the referencing token's path
 *       (same semantics as tier-emitter.mjs resolveRef)
 *   (3) no LIVE token references a $deprecated token (design-core AGENTS.md
 *       mistake #6), and no live emission token references a themes.* or
 *       component.* tier-excluded token (tier-emitter would fail on it).
 *
 * Merged namespace = union of every token name across the three files (canon
 * wins on collision, supplement next, breakpoints last). Unlike the emitter's
 * EMIT map, this union KEEPS $deprecated tokens (they must still be shape-
 * valid; references INTO them are exactly what check (3) flags) and KEEPS
 * themes.* (this audit validates file shape, not emission-tier policy).
 *
 * Exit 0 = no findings; exit 1 = any finding (fail closed). Zero deps, Node 24.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const CANON_PATH = "/home/p31/production/packages/canon/tokens/tokens.dtc.json";
const SUPPLEMENT_PATH = "/home/p31/production/design-workflow/A-token-pipeline/supplement.tokens.json";
const BREAKPOINTS_PATH = "/home/p31/production/design-workflow/B-device-tiers/breakpoints.tokens.json";

function fail(msg) {
  console.error(`❌ dtcg-shape-audit: ${msg}`);
  process.exit(1);
}

// ── CLI ────────────────────────────────────────────────────────────
let sourcesDir = null;
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === "--sources") {
    sourcesDir = process.argv[++i];
    if (!sourcesDir) fail("--sources requires a directory");
  } else if (a === "--help") {
    console.log("usage: node dtcg-shape-audit.mjs [--sources <dir>]");
    process.exit(0);
  } else {
    fail(`unknown argument: ${a}`);
  }
}

const files = [
  { label: "canon", path: sourcesDir ? join(sourcesDir, "tokens.dtc.json") : CANON_PATH },
  { label: "supplement", path: sourcesDir ? join(sourcesDir, "supplement.tokens.json") : SUPPLEMENT_PATH },
  { label: "breakpoints", path: sourcesDir ? join(sourcesDir, "breakpoints.tokens.json") : BREAKPOINTS_PATH },
];

// ── Load sources (fail closed) ─────────────────────────────────────
const docs = {};
for (const f of files) {
  if (!existsSync(f.path)) fail(`source file missing: ${f.path}`);
  try {
    docs[f.label] = JSON.parse(readFileSync(f.path, "utf8"));
  } catch (e) {
    fail(`cannot parse ${f.path}: ${e.message}`);
  }
}

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

// Per-file token lists (file:path attribution) + merged namespace (canon wins).
const perFile = [];
const merged = new Map();
for (const f of files) {
  const acc = [];
  if (f.label === "canon") {
    for (const key of Object.keys(docs.canon)) {
      if (key.startsWith("$")) continue;
      flatten({ [key]: docs.canon[key] }, "", acc);
    }
  } else {
    flatten(docs[f.label], "", acc);
  }
  perFile.push({ label: f.label, path: f.path, tokens: acc });
  for (const [name, tok] of acc) if (!merged.has(name)) merged.set(name, tok);
}

// Same resolution semantics as tier-emitter.mjs resolveRef.
function resolveRef(ref, fromName) {
  if (merged.has(ref)) return ref;
  const parts = fromName.split(".");
  for (let i = parts.length - 2; i >= 0; i--) {
    const cand = parts.slice(0, i + 1).concat(ref.split(".")).join(".");
    if (merged.has(cand)) return cand;
  }
  return null;
}

// ── Checks ─────────────────────────────────────────────────────────
const ALIAS_RE = /\{([^{}]+)\}/g;
const findings = [];
let liveConsumersChecked = 0;

for (const { path, tokens } of perFile) {
  for (const [name, tok] of tokens) {
    // (1) every token has a string $type
    if (typeof tok.$type !== "string" || tok.$type.length === 0) {
      findings.push(`${path}:${name} — token without string $type`);
    }
    // (2)+(3) aliases
    if (typeof tok.$value === "string") {
      for (const m of tok.$value.matchAll(ALIAS_RE)) {
        const ref = m[1];
        const target = resolveRef(ref, name);
        if (!target) {
          findings.push(`${path}:${name} — unresolved alias reference {${ref}}`);
          continue;
        }
        if (tok.$deprecated) continue; // only LIVE tokens are consumers (mistake #6)
        liveConsumersChecked++;
        const t = merged.get(target);
        if (t.$deprecated) {
          findings.push(
            `${path}:${name} — live token references deprecated token ${target} (design-core AGENTS.md mistake #6)`,
          );
        } else if (target.startsWith("themes.") || target.startsWith("component.")) {
          findings.push(
            `${path}:${name} — live emission token references tier-excluded token ${target} (tier-emitter excludes themes.*/component.* — it would fail)`,
          );
        }
      }
    }
  }
}

// ── Report ─────────────────────────────────────────────────────────
console.log("— DTCG shape audit (C-2) —");
let totalTokens = 0;
for (const f of perFile) {
  const deprecated = f.tokens.filter(([, t]) => t.$deprecated).length;
  totalTokens += f.tokens.length;
  console.log(`  ${f.label}: ${f.tokens.length} tokens (${deprecated} deprecated) ← ${f.path}`);
}
console.log(`  merged namespace: ${merged.size} names (union; canon wins, supplement then breakpoints)`);
console.log(`  live alias consumers checked: ${liveConsumersChecked}`);
console.log(`  findings: ${findings.length}`);
for (const fd of findings) console.log(`  FINDING ${fd}`);
console.log(findings.length === 0 ? "\nRESULT: PASS (DTCG shape OK)" : "\nRESULT: FAIL (fail closed)");
process.exit(findings.length === 0 ? 0 : 1);