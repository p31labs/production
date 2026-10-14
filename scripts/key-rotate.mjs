#!/usr/bin/env node
/**
 * scripts/key-rotate.mjs — P31 in-house key creator / rotator (zero-dep).
 *
 * Plain Node 24, no package.json, no install. Uses the built-in Web
 * Crypto (globalThis.crypto.getRandomValues) for key generation and
 * node:child_process to shell out to `wrangler` — which in turn uses the
 * owner's stored OAuth session (~/.wrangler/config/default.toml), the
 * real machine credential. This CLI never holds or transmits that
 * session itself.
 *
 * Subcommands:
 *   keygen                     — print fresh 32-byte base64url keys.
 *   backup <NAME> --worker <W> — capture the secret listing to a backup
 *                                 file (honest: Cloudflare returns names
 *                                 and metadata, never secret values).
 *   rotate <NAME> --worker <W> — the rotation: backup, put, verify,
 *                                 then print the dual-credential window
 *                                 summary + rollback instructions.
 *
 * Hard rules:
 *   - The new value travels via stdin to `wrangler secret put` — never
 *     via argv (argv is visible in `ps`).
 *   - The put is NEVER executed without an explicit --yes (or --dry-run,
 *     which only exercises backup + verification and prints what would
 *     run).
 *   - Output redacts key material unless --show-value is given.
 *   - This CLI is for secret rotation mechanics only. Production
 *     rotation (LOVE_AUTH_SECRET, gateway, worker secrets) is
 *     owner-executed. See docs/enterprise/operations/secret-rotation-runbook.md.
 *
 * Usage examples:
 *   node scripts/key-rotate.mjs keygen
 *   node scripts/key-rotate.mjs backup P31_ROTATOR_SMOKE --worker p31-key-rotator
 *   node scripts/key-rotate.mjs rotate P31_ROTATOR_SMOKE --worker p31-key-rotator --yes
 *   node scripts/key-rotate.mjs rotate P31_ROTATOR_SMOKE --worker p31-key-rotator \
 *     --value @key.txt --yes --health https://p31-key-rotator.trimtab-signal.workers.dev/health
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

const KEY_BYTES = 32; // 256-bit key material.
const WINDOW_HOURS_DEFAULT = 24; // dual-credential transition window.
const WRANGLER = process.env.WRANGLER_BIN || 'wrangler';

const USAGE = `usage:
  key-rotate.mjs keygen [--count N]
  key-rotate.mjs backup <SECRET_NAME> --worker <WORKER_NAME> [--backup-dir DIR]
  key-rotate.mjs rotate <SECRET_NAME> --worker <WORKER_NAME>
      [--value STRING|@FILE] [--yes] [--dry-run]
      [--health URL] [--window-hours N] [--backup-dir DIR] [--show-value]`;

function fail(msg) {
  console.error(`key-rotate: ${msg}`);
  console.error(USAGE);
  process.exit(1);
}

/** RFC 4648 base64url, unpadded — same encoding as workers/p31-key-rotator. */
function generateKey() {
  const out = new Uint8Array(KEY_BYTES);
  globalThis.crypto.getRandomValues(out);
  return Buffer.from(out).toString('base64url');
}

function sha256Fingerprint(value) {
  return createHash('sha256').update(value, 'utf8').digest('base64url');
}

function redact(value) {
  if (value.length <= 12) return '•'.repeat(value.length);
  return `${value.slice(0, 6)}…${value.slice(-4)} (${value.length} chars)`;
}

function stripAnsi(s) {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\u001b\[[0-9;]*m/g, '');
}

/** Run a command, capturing stdout/stderr/status. Never prints secrets. */
function run(cmd, args, input) {
  const r = spawnSync(cmd, args, {
    input: input === undefined ? undefined : input,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
  return {
    ok: r.status === 0,
    status: r.status,
    out: r.stdout ?? '',
    err: r.stderr ?? '',
    error: r.error ? String(r.error) : null,
  };
}

function timestampTag() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/**
 * Capture the current secret listing for <name> on <worker> into
 * .secret-backups/<name>-<tag>.json (mode 0600). Honest by construction:
 * whatever the API returns — including "listing not permitted" — is
 * recorded verbatim. Cloudflare never returns secret values, so the file
 * holds names/metadata + a fingerprint of the NEW value, never the old
 * one.
 */
function backup(name, worker, opts) {
  const dir = resolve(opts.backupDir || '.secret-backups');
  mkdirSync(dir, { recursive: true, mode: 0o700 });

  const listing = run(WRANGLER, ['secret', 'list', '--name', worker]);
  const path = join(dir, `${name}-${timestampTag()}.json`);
  const record = {
    recorded_at: new Date().toISOString(),
    secret_name: name,
    worker,
    listing_ok: listing.ok,
    listing_status: listing.status,
    listing_stdout: stripAnsi(listing.out),
    listing_stderr: stripAnsi(listing.err),
    honest_note:
      'The Cloudflare API returns secret NAMES and metadata only — it ' +
      'never returns secret values. The previous value must come from ' +
      'the owner vault for rollback. If listing_status is non-zero, the ' +
      'session does not permit listing and this file is the honest record ' +
      'of that.',
  };
  writeFileSync(path, JSON.stringify(record, null, 2) + '\n', {
    mode: 0o600,
  });

  console.log(`[backup] listing ${listing.ok ? 'captured' : 'NOT permitted (recorded honestly)'}`);
  if (!listing.ok) {
    console.log(`[backup] wrangler secret list exit ${listing.status}`);
    console.log(`[backup]   ${stripAnsi(listing.err).split('\n').slice(0, 4).join('\n  ')}`);
  }
  console.log(`[backup] wrote ${path} (0600)`);
  return { path, record };
}

/** Read the new value from --value (string or @file). */
function resolveValue(arg) {
  if (arg.startsWith('@')) {
    const p = resolve(arg.slice(1));
    if (!existsSync(p)) fail(`--value file not found: ${p}`);
    const v = readFileSync(p, 'utf8').trim();
    if (!v) fail(`--value file is empty: ${p}`);
    return v;
  }
  return arg;
}

function printWindowSummary(name, worker, windowHours, fingerprint, opts) {
  const now = Date.now();
  const drop = new Date(now + windowHours * 3600 * 1000).toISOString();
  console.log('\n=== Dual-credential transition window ===');
  console.log(`Secret:      ${name} (worker: ${worker})`);
  console.log(`New value:   ${opts.showValue ? opts.value : redact(opts.value)}`);
  console.log(`Fingerprint: sha256 ${fingerprint}`);
  console.log(`Window:      ${windowHours}h — the gateway/consumer accepts BOTH`);
  console.log(`             the old and the new value until ${drop}.`);
  console.log(`After:       the old value is DROPPED and rejected.`);
  console.log('Backup:      ' + (opts.backupPath ?? 'n/a'));
  console.log('\n=== Rollback (operator, owner-executed) ===');
  console.log(
    `  node scripts/key-rotate.mjs rotate ${name} --worker ${worker} ` +
      `--value <OLD_VALUE_FROM_VAULT> --yes`
  );
  console.log(
    '  The old value is NOT in the backup file — Cloudflare never returns\n' +
    '  secret values; it must come from the owner vault / password manager.'
  );
  console.log(
    'Docs: docs/enterprise/operations/secret-rotation-runbook.md'
  );
}

/* ------------------------------------------------------------------ */
/* Subcommand handlers                                                 */
/* ------------------------------------------------------------------ */

function cmdKeygen(args) {
  let count = 1;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count') count = Number(args[++i] ?? 1);
  }
  if (!Number.isInteger(count) || count < 1 || count > 32) fail('--count must be 1..32');
  for (let i = 0; i < count; i++) {
    const key = generateKey();
    console.log(`${key}\tsha256:${sha256Fingerprint(key)}`);
  }
}

function cmdBackup(name, opts) {
  backup(name, opts.worker, opts);
}

function cmdRotate(name, opts) {
  if (!opts.yes && !opts.dryRun) {
    console.error(
      `key-rotate: refusing to rotate "${name}" on worker "${opts.worker}" without --yes.\n` +
        `  Dry-run the mechanics instead: add --dry-run.\n` +
        `  Production rotation (LOVE_AUTH_SECRET, gateway, worker secrets) is owner-executed.`
    );
    process.exit(2);
  }

  // New value: explicit, or freshly generated.
  const value = opts.value === undefined ? generateKey() : resolveValue(opts.value);
  opts.value = value;
  const fingerprint = sha256Fingerprint(value);

  // 1. Backup the current listing (honest record, whatever the API says).
  console.log(`[1/4] backing up current listing for ${name} on ${opts.worker} …`);
  const { path: backupPath } = backup(name, opts.worker, opts);
  opts.backupPath = backupPath;

  // 2. Put the new value (stdin only — argv is visible in `ps`).
  console.log(`[2/4] ${opts.dryRun ? '[dry-run] would put' : 'putting'} ${name} on ${opts.worker} …`);
  if (!opts.dryRun) {
    // Two lines cover wrangler versions that double-prompt for the value;
    // extra stdin bytes are simply ignored when only one read happens.
    const put = run(WRANGLER, ['secret', 'put', name, '--name', opts.worker], `${value}\n${value}\n`);
    if (!put.ok) {
      console.error(`[2/4] wrangler secret put FAILED (exit ${put.status}).`);
      console.error(`[2/4] ${stripAnsi(put.err).split('\n').slice(0, 6).join('\n  ')}`);
      console.error('[2/4] the old value was not touched; rollback is not needed.');
      process.exit(1);
    }
    console.log(`[2/4] put ok (value sha256 ${fingerprint}).`);
  } else {
    console.log(`[2/4] [dry-run] command: wrangler secret put ${name} --name ${opts.worker} <value via stdin>`);
  }

  // 3. Verify — health check only. Cloudflare offers no read-back of
  //    secret values; the dual-credential window is what covers consumers.
  console.log('[3/4] verifying …');
  if (opts.health) {
    const h = run('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '-m', '15', opts.health]);
    const code = Number(h.out);
    const up = h.ok && code >= 200 && code < 300;
    console.log(`[3/4] GET ${opts.health} → HTTP ${code} (worker ${up ? 'up' : 'NOT healthy'})`);
    console.log(
      '[3/4] note: this verifies the worker is serving, not the secret value —'
    );
    console.log('[3/4]       the API never reads secrets back. Consumers validate');
    console.log('[3/4]       through the dual-credential window below.');
  } else {
    console.log('[3/4] no --health URL given; skipping live check (see runbook for consumer checks).');
  }

  // 4. Dual-credential transition window + rollback.
  console.log('[4/4] rotation plan:');
  printWindowSummary(name, opts.worker, opts.windowHours, fingerprint, opts);
  if (opts.dryRun) {
    console.log('\n[dry-run] nothing was written to Cloudflare. Re-run with --yes to rotate.');
  }
}

/* ------------------------------------------------------------------ */
/* Arg parsing                                                         */
/* ------------------------------------------------------------------ */

const argv = process.argv.slice(2);
const sub = argv[0];

if (!sub || sub === '--help' || sub === '-h') {
  console.log(USAGE);
  process.exit(sub ? 0 : 1);
}

if (sub === 'keygen') {
  cmdKeygen(argv.slice(1));
} else if (sub === 'backup' || sub === 'rotate') {
  const name = argv[1];
  if (!name) fail(`${sub} needs a SECRET_NAME`);
  const opts = { worker: null, yes: false, dryRun: false, value: undefined, health: null, windowHours: WINDOW_HOURS_DEFAULT, backupDir: null, showValue: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--worker') opts.worker = next();
    else if (a === '--yes') opts.yes = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--value') opts.value = next();
    else if (a === '--health') opts.health = next();
    else if (a === '--window-hours') opts.windowHours = Number(next());
    else if (a === '--backup-dir') opts.backupDir = next();
    else if (a === '--show-value') opts.showValue = true;
    else fail(`unknown flag: ${a}`);
  }
  if (!opts.worker) fail(`${sub} needs --worker <WORKER_NAME>`);
  if (!Number.isInteger(opts.windowHours) || opts.windowHours < 1) fail('--window-hours must be ≥ 1');

  if (sub === 'backup') cmdBackup(name, opts);
  else cmdRotate(name, opts);
} else {
  fail(`unknown subcommand: ${sub}`);
}