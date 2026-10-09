#!/usr/bin/env node
/**
 * Negative control for check-derived-names.mjs.
 *
 * Proves the gate FAILS on a raw identity literal (statedBy: 'guardian' /
 * author: 'lumi') and PASSES on a pickle name + codename() call. Exits 0 with
 * NEGATIVE_CONTROL_OK iff both phases behave as expected.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const gate = join(import.meta.dirname, 'check-derived-names.mjs');
const tmp = join(tmpdir(), 'derived-names-nc-' + Date.now());
mkdirSync(tmp, { recursive: true });

let failures = 0;
const note = (ok, msg) => { console.log(`${ok ? '  ✓' : '  ✗'} ${msg}`); if (!ok) failures++; };

// Phase A — a raw identity literal must FAIL the gate. Exercises all four
// identity fields (statedBy, author, agent, parentAgent) and asserts the gate
// output NAMES each one — proving every regex arm fires, not just that the
// gate failed for some field.
writeFileSync(join(tmp, 'bad.ts'), 'export const e = { statedBy: "guardian", author: "lumi", agent: "raw-agent", parentAgent: "raw-parent" };\n');
try {
  execSync(`node ${gate} --scan ${tmp}`, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000 });
  note(false, 'Phase A: gate accepted raw identity literals');
} catch (e) {
  const out = e.stderr?.toString() ?? '';
  note(e.status === 1, `Phase A: gate failed the raw identity (exit ${e.status})`);
  for (const field of ['statedBy', 'author', 'agent', 'parentAgent']) {
    note(out.includes(field), `Phase A: gate flagged the ${field} arm`);
  }
}
rmSync(join(tmp, 'bad.ts'), { force: true });

// Phase B — a pickle name + codename() call must PASS.
writeFileSync(join(tmp, 'good.ts'), "import { codename } from '@p31ca/canon/loom/codename';\nexport const e = { statedBy: 'Dill·ember', author: codename('lumi-agent') };\n");
try {
  execSync(`node ${gate} --scan ${tmp}`, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000 });
  note(true, 'Phase B: gate passed pickle name + codename()');
} catch (e) {
  note(false, `Phase B: gate flagged a pickle name / codename() (exit ${e.status})`);
}

rmSync(tmp, { recursive: true, force: true });

if (failures > 0) {
  console.error(`\nNEGATIVE_CONTROL_FAIL: ${failures} phase(s) misbehaved — the derived-names rule is not proven.`);
  process.exit(1);
}
console.log('\nNEGATIVE_CONTROL_OK: check-derived-names fails raw identities, spares pickle names + codename().');
process.exit(0);