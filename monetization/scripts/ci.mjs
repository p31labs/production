#!/usr/bin/env node
/**
 * In-house CI — runs the full gate, records DORA deploy events to p31-ci,
 * and deploys on success when --deploy is passed.
 * Usage: node scripts/ci.mjs [--deploy]
 * Env: CI_URL (p31-ci), CI_ISSUE_TOKEN (shared secret).
 */
import { execSync } from 'node:child_process';

const CI_URL = process.env.CI_URL || 'https://p31-ci.trimtab-signal.workers.dev';
const TOKEN = process.env.CI_ISSUE_TOKEN || '';
const SERVICE = process.env.CI_SERVICE || 'p31-monetization';
const COMMIT = process.env.CI_COMMIT || (execSync('git rev-parse --short HEAD 2>/dev/null || echo dev').toString().trim());
const DEPLOY = process.argv.includes('--deploy');

function record(eventType, extra = {}) {
  if (!TOKEN) return console.log(`(skip record ${eventType} — CI_ISSUE_TOKEN unset)`);
  const body = JSON.stringify({ event_type: eventType, service: SERVICE, commit_sha: COMMIT, ...extra });
  execSync(`curl -s -m 15 -X POST -H 'Content-Type: application/json' -H 'X-Issue-Token: ${TOKEN}' -d '${body}' ${CI_URL}/record >/dev/null 2>&1 || true`);
  console.log(`  dora: ${eventType}`);
}

const start = Date.now();
console.log(`P31 CI — ${SERVICE} @ ${COMMIT} (${DEPLOY ? 'deploy' : 'gate-only'})`);
record('deploy_start');

try {
  execSync('pnpm gate', { stdio: 'inherit', cwd: process.cwd() });
  const elapsed = Date.now() - start;
  record('deploy_success', { deploy_duration_ms: elapsed, change_failure: 0 });
  console.log(`Gate passed in ${(elapsed / 1000).toFixed(1)}s`);
  try {
    execSync('node scripts/sbom.mjs', { stdio: 'inherit', cwd: process.cwd() });
  } catch {
    console.warn('  sbom: skipped (scripts/sbom.mjs missing or failed)');
  }
  if (DEPLOY) {
    execSync('pnpm deploy', { stdio: 'inherit', cwd: process.cwd() });
    console.log('Deployed.');
  }
} catch (e) {
  const elapsed = Date.now() - start;
  record('deploy_failure', { deploy_duration_ms: elapsed, change_failure: 1 });
  console.error('Gate failed.');
  process.exit(1);
}