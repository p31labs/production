#!/usr/bin/env node
/**
 * Negative control for canon-source-audit.
 *
 * Proves the gate can FAIL on forks AND PASS on adapters — every outcome of
 * the R1 rule must be exercised:
 *
 *   Phase A (forks must fail):  raw-literal token, duplicate Topbar, import
 *     escape-hatch (imports Crown but hand-rolls CommandPalette), forked Crown.
 *   Phase B (adapter must pass):  a tree whose ONLY --p31-* defs are adapters
 *     (`--p31-x: var(--p31-canon)`) must exit 0 — not flagged.
 *   Phase C (self-cycle must fail):  a tree defining `--p31-x: var(--p31-x)`
 *     (a cycle that resolves to guaranteed-invalid) must exit non-zero.
 *
 * STRONG CONTRACT: exits 0 + emits NEGATIVE_CONTROL_OK only when all three
 * phases behave as expected. Otherwise exits 1.
 */
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const gate = '/home/p31/production/tools/canon-audit/canon-source-audit.mjs';
const tmp = join(tmpdir(), 'canon-audit-nc-' + Date.now());
mkdirSync(join(tmp, 'components'), { recursive: true });

// ── Phase A fixtures ──────────────────────────────────────────────
// R1 trigger — a CSS file defining a raw-literal --p31-* token.
writeFileSync(join(tmp, 'fork.css'), ':root { --p31-accent: oklch(0.87 0.148 203); }\n');
// R2 trigger — a component duplicating the canon's Topbar export.
writeFileSync(join(tmp, 'components', 'Topbar.tsx'), 'export function Topbar() { return <header />; }\n');
// R2 escape-hatch probe — imports Crown from canon but hand-rolls Topbar.
writeFileSync(
  join(tmp, 'components', 'CommandPalette.tsx'),
  "import { Crown } from '@p31ca/design-core/compositions';\nexport function CommandPalette() { return <div>hand-rolled</div>; }\n",
);
writeFileSync(
  join(tmp, 'components', 'Crown.tsx'),
  "export function Crown() { return <span>forked</span>; }\n",
);
// Genuine-consumer probes — must NOT be flagged.
writeFileSync(
  join(tmp, 'components', 'SpoonDial.tsx'),
  "import SpoonDial from '@p31ca/design-core/compositions/SpoonDial';\nexport default SpoonDial;\n",
);
writeFileSync(
  join(tmp, 'components', 'ModePill.tsx'),
  "import * as ModePillNS from '@p31ca/design-core/compositions/ModePill';\nexport const ModePill = ModePillNS.ModePill;\n",
);

// ── Phase B fixture — adapter-only tree (must PASS) ───────────────
const adapterDir = join(tmp, 'adapter-ok');
mkdirSync(adapterDir, { recursive: true });
writeFileSync(join(adapterDir, 'tokens.css'), ':root { --p31-ink: var(--p31-text-primary); --p31-paper: var(--p31-void); --p31-accent-soft: color-mix(in oklch, var(--p31-accent) 18%, transparent); }\n');

// ── Phase C fixture — self-cycle (must FAIL) ──────────────────────
const cycleDir = join(tmp, 'cycle-bad');
mkdirSync(cycleDir, { recursive: true });
writeFileSync(join(cycleDir, 'tokens.css'), ':root { --p31-glass-border: var(--p31-glass-border); }\n');

let failures = 0;
const note = (ok, msg) => { console.log(`${ok ? '  ✓' : '  ✗'} ${msg}`); if (!ok) failures++; };

// ── Phase A: forks must fail, genuine consumers spared ────────────
try {
  execSync(`node ${gate} --target ${tmp}`, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000 });
  note(false, 'Phase A: gate accepted forks (raw literal + duplicate Topbar + escape hatch)');
} catch (e) {
  if (e.status === 1) {
    const out = e.stderr?.toString() ?? e.stdout?.toString() ?? '';
    note(out.includes('Topbar.tsx') && out.includes('CommandPalette.tsx') && out.includes('Crown.tsx'), 'Phase A: gate flagged the three forks');
    note(!out.includes('SpoonDial.tsx') && !out.includes('ModePill.tsx'), 'Phase A: gate spared the default/namespace-import consumers');
  } else {
    note(false, `Phase A: unexpected gate exit ${e.status}`);
  }
}

// ── Phase B: an adapter-only tree must PASS ───────────────────────
try {
  execSync(`node ${gate} --target ${adapterDir}`, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000 });
  note(true, 'Phase B: gate passed an adapter-only tree (adapter aliases are not forks)');
} catch (e) {
  note(false, `Phase B: gate flagged a genuine adapter (exit ${e.status}) — adapter rule not recognized`);
}

// ── Phase C: a self-cycle must FAIL ───────────────────────────────
try {
  execSync(`node ${gate} --target ${cycleDir}`, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000 });
  note(false, 'Phase C: gate passed a self-cycle (var(--p31-x) referencing itself) — cycle not caught');
} catch (e) {
  if (e.status === 1) note(true, 'Phase C: gate failed the self-cycle token');
  else note(false, `Phase C: unexpected gate exit ${e.status}`);
}

rmSync(tmp, { recursive: true, force: true });

if (failures > 0) {
  console.error(`\nNEGATIVE_CONTROL_FAIL: ${failures} phase(s) misbehaved — the R1 rule is not fully proven.`);
  process.exit(1);
}
console.log('\nNEGATIVE_CONTROL_OK: canon-source-audit fails on forks + self-cycles, passes adapters, spares consumers.');
process.exit(0);