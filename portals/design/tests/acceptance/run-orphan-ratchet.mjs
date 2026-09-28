#!/usr/bin/env node
/**
 * Orphan ratchet (P4) — the orphan allowlist IS the ratchet.
 *
 * audit-orphans fails if a NEW orphan (not in orphan-allowlist.json) appears.
 * The allowlist is shrink-only: it starts at 15 (the D12 seed) and can only
 * get smaller as orphans are deleted. There is no separate baseline number —
 * the allowlist IS the floor.
 *
 * This gate: run the audit. It exits non-zero on new orphans, which is the
 * enforcement. It also reports the current count so the floor can be lowered
 * when orphans are deleted (the audit writes orphan-count.json).
 */
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const here = resolve(import.meta.dirname);
const portal = resolve(here, '..', '..');

try {
  execSync('node tests/acceptance/audit-orphans.mjs', { cwd: portal, stdio: 'inherit' });
} catch {
  process.exit(1);
}
console.log('✅ ORPHAN RATCHET: no new orphans. Allowlist (the floor) is shrink-only — delete orphans to lower it.');