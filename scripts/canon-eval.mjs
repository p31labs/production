/**
 * canon-eval — the P31 vibe-test (the artifact that makes the canon a product
 * for agents, not just a library for humans).
 *
 * The Astryx pattern: measure whether an agent using the design system
 * produces GOOD code, across five scored dimensions. This is the file that
 * converts "we have a design system agents should use" into "here is the
 * measurement of whether agents using it produce correct UI."
 *
 * Usage:
 *   node scripts/canon-eval.mjs            # score the built-in samples
 *   node scripts/canon-eval.mjs <file>     # score an agent-generated file
 *
 * CI: fail when any sample scores below its dimension floors.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// The canon's real token surface (a closed sample — the audit gate is the
// authoritative list; this is the eval's working set).
const KNOWN_TOKENS = new Set([
  '--p31-bg', '--p31-bg-deep', '--p31-surface', '--p31-surface2',
  '--p31-text', '--p31-text-secondary', '--p31-text-tertiary',
  '--p31-accent', '--p31-accent-gold', '--p31-accent-green', '--p31-accent-red',
  '--p31-glass-bg', '--p31-glass-border',
  '--p31-space-sm', '--p31-space-md', '--p31-radius-md', '--p31-radius-lg',
  '--p31-touch-min', '--p31-touch-recommended', '--p31-touch-large',
  '--p31-z-floating', '--p31-z-starfield',
]);

const DIMENSIONS = [
  {
    id: 'correctness',
    label: 'correctness',
    score: (src) => {
      let violations = 0;
      // Any var(--p31-*) must be a real token (closed list).
      const refs = src.match(/var\((--p31-[a-z0-9-]+)\)/g) ?? [];
      for (const ref of refs) {
        const name = ref.slice(4, -1);
        if (!KNOWN_TOKENS.has(name)) violations += 1;
      }
      // No invented AAF actions.
      const actions = src.match(/data-agent-action="([^"]+)"/g) ?? [];
      for (const a of actions) {
        if (!/^instrument\.[a-z0-9.]+$/.test(a.slice('data-agent-action="'.length, -1))) violations += 1;
      }
      return Math.max(0, Math.round(100 - violations * 25));
    },
    floor: 80,
  },
  {
    id: 'accessibility',
    label: 'accessibility',
    score: (src) => {
      let violations = 0;
      // Touch targets ≥ 48px: either var(--p31-touch-*) or an explicit ≥48px.
      const hasTouch = /var\(--p31-touch|min-height:\s*(?:48|5\d|6\d|7\d)px|height:\s*(?:48|5\d|6\d|7\d)px/.test(src);
      if (!hasTouch) violations += 1;
      // Text ≥ 16px (the family floor).
      const hasFont = /font(-size)?:\s*1[6-9]px|1[6-9]px\/|var\(--p31-.*\)/.test(src);
      if (!hasFont) violations += 1;
      // aria-label/aria-* on interactive surfaces.
      if (!/aria-label|aria-pressed|role=/.test(src)) violations += 1;
      return Math.max(0, Math.round(100 - violations * 25));
    },
    floor: 80,
  },
  {
    id: 'code-quality',
    label: 'code quality',
    score: (src) => {
      let violations = 0;
      // Imports from the canon/design-core packages, not bare reimplementations.
      const imports = src.match(/from\s+['"]@p31\/(?:canon|design-core)[^'"]*['"]/g) ?? [];
      if (imports.length === 0) violations += 2;
      // Inline style={{...}} object soup is a smell only past a light threshold —
      // a card with token styles is fine, a whole reimplemented system is not.
      const inlineStyles = (src.match(/style=\{\{/g) ?? []).length;
      if (inlineStyles > 3) violations += inlineStyles - 3;
      return Math.max(0, Math.round(100 - violations * 20));
    },
    floor: 80,
  },
  {
    id: 'efficiency',
    label: 'efficiency',
    score: (src) => {
      // Raw color literals are the design gate's hard no — each one counts.
      const hex = (src.match(/#[0-9a-f]{3,8}/gi) ?? []).length;
      const rgb = (src.match(/\brgba?\s*\(/g) ?? []).length;
      const oklch = (src.match(/\boklch\s*\(/g) ?? []).length;
      return Math.max(0, Math.round(100 - (hex + rgb + oklch) * 20));
    },
    floor: 90,
  },
  {
    id: 'maintainability',
    label: 'maintainability',
    score: (src) => {
      let violations = 0;
      // The AAF contract: every interactive element carries kind + action.
      const interactive = (src.match(/<button|<input|<a /g) ?? []).length;
      const aaf = (src.match(/data-agent-kind=/g) ?? []).length;
      if (interactive > 0 && aaf < interactive) violations += 1;
      // Design-core compositions, not hand-rolled chrome.
      if (!/@p31\/design-core\/compositions/.test(src) && !/from\s+['"]@p31\/design-core/.test(src)) violations += 1;
      return Math.max(0, Math.round(100 - violations * 25));
    },
    floor: 80,
  },
];

function score(src) {
  const rows = DIMENSIONS.map((d) => ({ id: d.id, label: d.label, score: d.score(src), floor: d.floor }));
  const overall = Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length);
  return { rows, overall, passed: rows.every((r) => r.score >= r.floor) && overall >= 80 };
}

function render(name, result) {
  console.log(`\n  canon-eval — ${name}`);
  for (const r of result.rows) {
    const flag = r.score >= r.floor ? '✓' : '✗';
    console.log(`    ${flag} ${r.label.padEnd(14)} ${String(r.score).padStart(3)} / ${r.floor}`);
  }
  console.log(`    ${result.passed ? 'PASS' : 'FAIL'}  overall ${result.overall} / 100\n`);
}

function main() {
  const target = process.argv[2];
  if (target) {
    const src = readFileSync(target, 'utf8');
    render(target, score(src));
    const result = score(src);
    if (!result.passed) process.exit(1);
    return;
  }

  // Built-in samples: a known-good baseline and a plausible bad agent output.
  const dir = join(__dirname, 'canon-eval');
  const files = readdirSync(dir).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));
  for (const f of files.sort()) {
    const src = readFileSync(join(dir, f), 'utf8');
    render(f, score(src));
  }

  const good = score(readFileSync(join(dir, 'sample-good.tsx'), 'utf8'));
  const bad = score(readFileSync(join(dir, 'sample-bad.tsx'), 'utf8'));
  console.log(`  baseline ${good.overall} vs agent output ${bad.overall} (gap ${good.overall - bad.overall})`);
  // The harness must DISCRIMINATE: the good sample passes, the bad sample fails.
  if (!good.passed || bad.passed) process.exit(1);
}

main();