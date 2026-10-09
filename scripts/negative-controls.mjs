#!/usr/bin/env node
/**
 * negative-controls.mjs — the proof the gates can fail (W20).
 *
 * Every gate must be able to fail. This suite plants each violation,
 * runs the gate, and asserts it fails. A gate that cannot fail is furniture.
 *
 * Usage: node scripts/negative-controls.mjs
 */
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SCRIPT = (n) => join(ROOT, 'scripts', n);

let pass = 0;
let fail = 0;

function run(name, script, args = []) {
  try {
    execSync(`node ${SCRIPT(script)} ${args.join(' ')}`, { stdio: 'pipe', cwd: ROOT });
    return { blocked: false };
  } catch (e) {
    return { blocked: true, output: String(e.stderr ?? e.stdout ?? '') };
  }
}

function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${detail}`); }
}

console.log('P31 negative controls — proving every gate can fail\n');

// 1. Veto: a planted rm -rf in an authored script must fail veto-check.
{
  const plant = join(ROOT, 'scripts', '__planted_veto.mjs');
  writeFileSync(plant, '// planted\nconst x = "rm -rf ./data/vault";\n');
  const r = run('veto gate catches planted rm -rf', 'veto-check');
  check('veto-check fails on rm -rf', r.blocked);
  unlinkSync(plant);
}

// 2. Chain: a tampered ledger entry must fail verify-chain.
{
  const ledger = join(ROOT, '.workspace', 'ledger.jsonl');
  if (existsSync(ledger)) {
    const backup = ledger + '.bak';
    copyFileSync(ledger, backup);
    const lines = readFileSync(ledger, 'utf8').split('\n');
    if (lines[0]) {
      const entry = JSON.parse(lines[0]);
      entry.operation = 'hard-delete'; // tamper
      lines[0] = JSON.stringify(entry);
      writeFileSync(ledger, lines.join('\n'));
    }
    const r = run('verify-chain detects tamper', 'verify-chain');
    check('verify-chain fails on tampered ledger', r.blocked);
    copyFileSync(backup, ledger);
    unlinkSync(backup);
  } else {
    console.log('  - ledger empty, skipping chain negative control');
  }
}

// 3. Token: an execute without a token must fail token-check.
{
  const ledger = join(ROOT, '.workspace', 'ledger.jsonl');
  if (existsSync(ledger)) {
    const backup = ledger + '.bak';
    copyFileSync(ledger, backup);
    const { append } = await import('./lib/ledger.mjs');
    await append('execute', { action: 'soft-delete', path: './test', reason: 'test', token_id: undefined });
    const r = run('token-check rejects token-less execute', 'token-check');
    check('token-check fails on token-less execute', r.blocked);
    copyFileSync(backup, ledger);
    unlinkSync(backup);
  }
}

// 4. Soft-delete: a hard-delete before the window must fail.
{
  const ledger = join(ROOT, '.workspace', 'ledger.jsonl');
  if (existsSync(ledger)) {
    const backup = ledger + '.bak';
    copyFileSync(ledger, backup);
    const { append } = await import('./lib/ledger.mjs');
    await append('execute', { action: 'soft-delete', path: './test2', dest: './.trash/x', reason: 'test', token_id: 'tok-1', at: new Date().toISOString() });
    await append('execute', { action: 'hard-delete', path: './test2', reason: 'test', token_id: 'tok-1', at: new Date(Date.now() - 24 * 3600 * 1000).toISOString() });
    const r = run('soft-delete-check rejects premature hard delete', 'soft-delete-check');
    check('soft-delete-check fails on premature hard delete', r.blocked);
    copyFileSync(backup, ledger);
    unlinkSync(backup);
  }
}

// 5. Ownership: a planted unfiled TODO must fail fix-plan-scan.
{
  const plant = join(ROOT, 'scripts', '__planted_todo.mjs');
  writeFileSync(plant, '// TODO: planted unfiled marker\n');
  const r = run('fix-plan-scan rejects unfiled TODO', 'fix-plan-scan');
  check('fix-plan-scan fails on unfiled TODO', r.blocked);
  unlinkSync(plant);
}

// 6. Coverage: a planted untagged plan must fail audit-coverage.
{
  const plant = join(ROOT, 'docs', 'plans', '__planted_noheader.md');
  writeFileSync(plant, '# Planted plan with no header\n');
  const r = run('audit-coverage rejects untagged plan', 'audit-coverage');
  check('audit-coverage fails on untagged plan', r.blocked);
  unlinkSync(plant);
}

// 7. Redundancy: a planted double-padded card must fail audit-redundancy.
{
  const plant = join(ROOT, 'portals', 'shell', 'src', '__planted_redundancy.tsx');
  writeFileSync(plant, '<GlassCard className="import-dialog"><CardBody><p>x</p></CardBody></GlassCard>\n');
  const r = run('audit-redundancy rejects double-padded card', 'audit-redundancy');
  check('audit-redundancy fails on double-padded card', r.blocked);
  unlinkSync(plant);
}

// 8. Scope: a planted out-of-scope change must fail audit-scope.
{
  const lockPath = join(ROOT, '.workspace', 'scope-lock.json');
  const lockBackup = lockPath + '.bak';
  const hadLock = existsSync(lockPath);
  if (hadLock) copyFileSync(lockPath, lockBackup);
  writeFileSync(lockPath, JSON.stringify({
    task_id: 'negative-control',
    allowed_paths: ['scripts/audit-scope.mjs'],
    created_at: new Date().toISOString(),
  }, null, 2));
  const plant = join(ROOT, 'scripts', '__planted_out_of_scope.mjs');
  writeFileSync(plant, '// planted out-of-scope change\n');
  const r = run('audit-scope rejects out-of-scope change', 'audit-scope');
  check('audit-scope fails on out-of-scope change', r.blocked);
  unlinkSync(plant);
  if (hadLock) { copyFileSync(lockBackup, lockPath); unlinkSync(lockBackup); }
  else { unlinkSync(lockPath); }
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) { console.error('NEGATIVE CONTROLS: FAIL'); process.exit(1); }
console.log('negative controls: all gates proven fail-able');