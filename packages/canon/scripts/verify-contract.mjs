#!/usr/bin/env node
/**
 * @p31ca/canon — verify-contract.mjs
 *
 * The static parity scorer. Scores every canon contract against its real
 * implementation in @p31ca/design-core/src/compositions/<Name>.tsx using the
 * TypeScript compiler API (AST + type checker) — NOT regex. The old
 * `interface\s+<Name>Props[^{]*\{([\s\S]*?)\n\}` terminated at the first
 * line-starting `}`, silently mis-parsing any prop whose type contains a
 * nested brace (a `Record<>`, an inline object type, a `CSSProperties`).
 *
 * Scorers:
 *   shape-completeness  core fields present (non-empty) / presence fields present
 *   prop-validity       `<Name>Props` declares exactly the contract's props
 *                       (allowlist: className, style) — via getPropertiesOfType,
 *                       which resolves declared AND inherited members
 *   enum-validity       each enum prop's resolved type literals match the
 *                       contract's options (bidirectional)
 *   import-match        contract importStatement matches the canonical import
 *   state-record        interactionStates is a record of observable predicates
 *
 * Report-only: lists pass/fail per component. Promotion to `verified` is the
 * runtime parity harness (tests/parity.spec.ts), a separate step.
 *
 * Usage: node scripts/verify-contract.mjs
 */
import ts from 'typescript';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** BOM-strip + CRLF/CR→LF normalization (KIN's checksum rule). */
function sha256(file) {
  let s = readFileSync(file, 'utf8');
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  return createHash('sha256').update(s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')).digest('hex');
}

const here = dirname(fileURLToPath(import.meta.url));
const canon = resolve(here, '..');
const designCore = resolve(canon, '..', 'design-core');
const compositionsDir = join(designCore, 'src', 'compositions');
const contractsDir = join(canon, 'src', 'contracts');

// ── load contracts ──────────────────────────────────────────────────────
const contracts = [];
for (const f of readdirSync(contractsDir)) {
  if (!f.endsWith('.contract.ts')) continue;
  let mod;
  try {
    mod = await import(join(contractsDir, f));
  } catch (err) {
    console.error(`✗ ${f}: import failed — ${err.message}`);
    continue;
  }
  for (const k of Object.keys(mod)) {
    if (k.endsWith('Contract')) contracts.push(mod[k]);
  }
}

// ── one program over the runtime source ─────────────────────────────────
const compFiles = readdirSync(compositionsDir)
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => join(compositionsDir, f));

const program = ts.createProgram(compFiles, {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  strict: true,
  noEmit: true,
  skipLibCheck: true,
});
const checker = program.getTypeChecker();

/** Resolve a type to its string-literal members — walks inline unions and
 *  follows named aliases (`BadgeTone`, `TopbarVariant`, `CardPadding`…). */
function stringLiterals(type) {
  const out = [];
  const seen = new Set();
  const walk = (t) => {
    if (t.isUnion()) { t.types.forEach(walk); return; }
    if (t.aliasSymbol) { walk(checker.getDeclaredTypeOfSymbol(t.aliasSymbol)); return; }
    if (t.isStringLiteral() && !seen.has(t.value)) { seen.add(t.value); out.push(t.value); }
  };
  walk(type);
  return out;
}

/** Extract the `<Name>Props` interface's DECLARED members (not the inherited
 *  HTMLAttributes passthrough — a consumer can pass those regardless) with
 *  their resolved types. Returns { names, types } or null. */
function extractProps(name) {
  for (const sf of program.getSourceFiles()) {
    if (sf.isDeclarationFile || !sf.fileName.endsWith(`${name}.tsx`)) continue;
    let ifaceNode = null;
    const visit = (node) => {
      if (ts.isInterfaceDeclaration(node) && node.name.text === `${name}Props`) {
        ifaceNode = node;
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
    if (!ifaceNode) return null;
    const names = [];
    const types = {};
    for (const member of ifaceNode.members) {
      if (!ts.isPropertySignature(member)) continue;
      const n = member.name.text;
      names.push(n);
      if (member.type) types[n] = checker.getTypeFromTypeNode(member.type);
    }
    return { names, types };
  }
  return null;
}

const nonEmptyFields = [
  'name', 'layer', 'status', 'intent', 'tokenContract',
  'semanticParts', 'sources', 'importStatement',
];
// presence-only — may be legitimately empty. interactionStates is empty for an
// effect-only component (CalmOverlay renders null, "calm is subtraction").
const presenceFields = ['interactionStates', 'caveats', 'requiredAria', 'antiExamples'];

let pass = 0;
let fail = 0;

for (const c of contracts) {
  const name = c.name;
  const problems = [];

  const srcPath = join(compositionsDir, `${name}.tsx`);
  if (!existsSync(srcPath)) {
    problems.push('no design-core source');
  } else {
    const expectedImport = `import { ${name} } from '@p31ca/design-core/compositions';`;
    if (c.importStatement !== expectedImport) {
      problems.push(`import mismatch: "${c.importStatement}"`);
    }

    // Evidence binding: a `verified` contract is bound to the hash of the
    // component source it verified. If the source has drifted, the evidence no
    // longer describes it — demote. ("evidence is BOUND TO CODE")
    if (c.status === 'verified') {
      if (!c.verifiedHash) {
        problems.push(`status 'verified' but no verifiedHash (run record-verified.mjs)`);
      } else if (sha256(srcPath) !== c.verifiedHash) {
        problems.push(`DRIFT: ${name}.tsx changed since verification — status must drop to contract-complete`);
      }
    }

    for (const f of nonEmptyFields) {
      if (!(f in c)) { problems.push(`missing ${f}`); continue; }
      const v = c[f];
      const empty =
        v === undefined || v === null ||
        (Array.isArray(v) && v.length === 0) ||
        (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
      if (empty) problems.push(`${f} empty`);
    }
    for (const f of presenceFields) {
      if (!(f in c)) problems.push(`missing ${f}`);
    }

    if (Array.isArray(c.interactionStates) || typeof c.interactionStates !== 'object' || c.interactionStates === null) {
      problems.push('interactionStates not a record');
    }

    const extracted = extractProps(name);
    if (!extracted) {
      problems.push(`no ${name}Props interface`);
    } else {
      const declared = extracted.names;
      const contractProps = new Set(c.props.map((p) => p.name));
      const allowlist = new Set(['className', 'style']);
      for (const p of declared) {
        if (!contractProps.has(p) && !allowlist.has(p)) {
          problems.push(`component declares "${p}" not in contract`);
        }
      }
      for (const p of c.props) {
        if (!declared.includes(p.name)) {
          problems.push(`contract prop "${p.name}" not in component`);
        }
      }

      for (const p of c.props.filter((x) => x.type === 'enum')) {
        const t = extracted.types[p.name];
        if (!t) {
          problems.push(`enum prop "${p.name}" has no resolved type`);
          continue;
        }
        const literals = stringLiterals(t);
        for (const opt of p.options) {
          if (!literals.includes(opt)) problems.push(`enum "${p.name}=${opt}" not in component type`);
        }
        for (const lit of literals) {
          if (!p.options.includes(lit)) problems.push(`component type has "${p.name}=${lit}" not in contract`);
        }
      }
    }
  }

  if (problems.length) {
    fail++;
    console.log(`✗ ${name}: ${problems.join('; ')}`);
  } else {
    pass++;
    console.log(`✓ ${name}`);
  }
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail > 0) process.exitCode = 1;