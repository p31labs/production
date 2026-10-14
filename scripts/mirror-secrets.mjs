#!/usr/bin/env node
/**
 * scripts/mirror-secrets.mjs — secret mirroring to Cloudflare Workers (zero-dep).
 *
 * Plain Node 24, no package.json, no install — same pattern as
 * scripts/key-rotate.mjs. Reads a secret manifest (names + source) and
 * pushes values to Cloudflare via `wrangler secret bulk` (one request for
 * all names) or, on older wrangler versions, iterates `wrangler secret put`
 * with each value travelling via stdin.
 *
 * Manifest shape (JSON):
 *   {
 *     "worker": "mcp-x402-gateway",
 *     "secrets": [
 *       { "name": "LOVE_AUTH_SECRET", "source": "gha",   "envName": "CF_LOVE_AUTH_SECRET" },
 *       { "name": "ROTATOR_SHARED_SECRET", "source": "envrc" },
 *       { "name": "ENTITLEMENT_API_TOKEN", "source": "stdin" }
 *     ]
 *   }
 *   "secrets" may also be a map: { "NAME": "gha" } or { "NAME": { source, envName } }.
 *
 * Sources:
 *   env   — process.env[name or envName]
 *   gha   — process.env[envName or name] (the GitHub Actions step exports the
 *           repo secret into the environment; see CI wiring in the ops docs)
 *   envrc — a dotenv/direnv file (default: ./envrc-path via --envrc)
 *   stdin — the value is taken from a JSON object piped on stdin
 *           ({ "NAME": "value", ... }) — never from argv.
 *
 * Hard rules:
 *   - DRY RUN IS THE DEFAULT. A real push runs only with --yes.
 *   - Values are never printed, never logged, never placed in argv.
 *     Wrangler output is scrubbed of every known value before it is shown.
 *   - One audit line (timestamp, worker, names, mode, result — no values)
 *     is appended to .secret-mirror/audit.log (0600, gitignored via *.log).
 *   - No production rotation/placement is performed by agents; this tool
 *     only mirrors values the caller already holds. Owner-executed for
 *     production. See docs/enterprise/operations/secret-rotation-runbook.md
 *     and docs/enterprise/operations/secrets-inventory.md.
 *
 * Usage:
 *   node scripts/mirror-secrets.mjs --manifest scripts/mirror-secrets.manifest.json
 *   node scripts/mirror-secrets.mjs --manifest scripts/mirror-secrets.manifest.json --yes
 *   node scripts/mirror-secrets.mjs --manifest scripts/mirror-secrets.manifest.json \
 *     --envrc /home/p31/.envrc --dry-run
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const WRANGLER = process.env.WRANGLER_BIN || 'wrangler';
const AUDIT_DIR = resolve(REPO, '.secret-mirror');
const AUDIT_LOG = resolve(AUDIT_DIR, 'audit.log');

const USAGE = `usage:
  mirror-secrets.mjs --manifest <PATH> [--worker <NAME>]
      [--envrc <PATH>] [--dry-run] [--yes] [--audit <PATH>]

  --manifest   JSON manifest (worker + secrets + sources). Required.
  --worker     Override the manifest's worker name.
  --envrc      Dotenv file for entries with source "envrc". Default: the
               manifest's "envrc" field, else ".envrc".
  --dry-run    Print the plan + the exact wrangler command; no push.
               This is the DEFAULT. A push requires --yes.
  --yes        Execute the push (wrangler secret bulk or per-secret put).
  --audit      Audit log path. Default: .secret-mirror/audit.log`;

function fail(msg) {
  console.error(`mirror-secrets: ${msg}`);
  console.error(USAGE);
  process.exit(2);
}

function scrub(text, values) {
  let out = text;
  for (const v of values) {
    if (v && v.length >= 4) out = out.split(v).join('[REDACTED]');
  }
  return out;
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

/** wrangler version line, e.g. "4.112.0". */
function wranglerVersion() {
  const r = run(WRANGLER, ['--version'], '');
  const m = /(\d+\.\d+\.\d+)/.exec(`${r.out}\n${r.err}`);
  return m ? m[1] : 'unknown';
}

/** Does this wrangler support `secret bulk`? Read-only probe. */
function bulkSupported() {
  return run(WRANGLER, ['secret', 'bulk', '--help'], '').ok;
}

/** Parse a dotenv file into { KEY: value }. Subset: comments, blanks,
 *  `KEY=value`, `export KEY=value`, single/double-quoted values.
 *  Returns null when the file does not exist (entries then report MISSING
 *  and the push is refused — never a partial mirror). */
function parseDotenv(path) {
  if (!existsSync(path)) return null;
  const out = {};
  const text = readFileSync(path, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const kv = line.replace(/^export\s+/, '');
    const eq = kv.indexOf('=');
    if (eq <= 0) continue;
    const key = kv.slice(0, eq).trim();
    let val = kv.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/** Normalise the manifest "secrets" field to a list of spec objects. */
function normalizeSecrets(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([name, spec]) => {
      if (typeof spec === 'string') return { name, source: spec };
      return { name, ...spec };
    });
  }
  throw new Error('manifest "secrets" must be an array or an object map');
}

function main(argv) {
  const args = argv.slice(2);
  let manifestPath = null;
  let workerOverride = null;
  let envrcPath = null;
  let auditPath = AUDIT_LOG;
  let yes = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--manifest') manifestPath = args[++i];
    else if (a === '--worker') workerOverride = args[++i];
    else if (a === '--envrc') envrcPath = args[++i];
    else if (a === '--audit') auditPath = args[++i];
    else if (a === '--yes') yes = true;
    else if (a === '--dry-run') yes = false;
    else fail(`unknown flag: ${a}`);
  }
  if (!manifestPath) fail('--manifest is required');

  const manifest = JSON.parse(readFileSync(resolve(manifestPath), 'utf8'));
  const worker = workerOverride || manifest.worker;
  if (!worker) fail('manifest has no "worker" and --worker was not given');
  const secrets = normalizeSecrets(manifest.secrets);

  // Resolve values per source.
  let dotenv = null;
  let dotenvPath = null;
  let dotenvMissing = false;
  const stdinJson = readStdinJson();
  const resolved = secrets.map((s) => {
    const src = s.source || 'env';
    const envName = s.envName || s.name;
    let value;
    let from = src;
    if (src === 'env' || src === 'gha') {
      value = process.env[envName];
      from = src === 'gha' ? `gha:${envName}` : `env:${envName}`;
    } else if (src === 'envrc') {
      dotenvPath = envrcPath || manifest.envrc || '.envrc';
      if (dotenv === null) {
        dotenv = parseDotenv(dotenvPath);
        dotenvMissing = dotenv === null;
      }
      value = dotenv ? dotenv[s.envName || s.name] : undefined;
      from = `envrc:${s.envName || s.name}`;
    } else if (src === 'stdin') {
      value = stdinJson ? stdinJson[s.name] : undefined;
      from = 'stdin';
    } else {
      fail(`unknown source "${src}" for ${s.name}`);
    }
    return { ...s, value, from };
  });

  const present = resolved.filter((s) => typeof s.value === 'string' && s.value.length > 0);
  const missing = resolved.filter((s) => !(typeof s.value === 'string' && s.value.length > 0));
  const values = present.map((s) => s.value);
  const version = wranglerVersion();
  const bulk = bulkSupported();

  // ── Plan (dry run — always printed, values never shown) ──────────────
  console.log(`mirror-secrets: ${yes ? 'PUSH' : 'DRY RUN'} — worker ${worker}`);
  console.log(`manifest: ${manifestPath}`);
  console.log(`wrangler: ${version} — secret bulk ${bulk ? 'SUPPORTED' : 'NOT SUPPORTED (per-secret put fallback)'}`);
  if (dotenvMissing) {
    console.log(`warn: envrc file not found: ${dotenvPath} — entries with source "envrc" report MISSING`);
  }
  console.log('plan:');
  for (const s of resolved) {
    const ok = typeof s.value === 'string' && s.value.length > 0;
    const preview = ok
      ? `${'•'.repeat(Math.min(s.value.length, 24))} (${s.value.length} chars)`
      : 'MISSING';
    console.log(`  ${s.name.padEnd(24)} ${s.from.padEnd(24)} ${ok ? 'PRESENT ' : ''}${preview}`);
  }
  if (missing.length > 0) {
    console.log(`missing: ${missing.map((s) => s.name).join(', ')} (set the env var / dotenv entry / stdin value, then re-run)`);
  }

  // ── Dry run: never call wrangler for the push. ───────────────────────
  if (!yes) {
    const preview = Object.fromEntries(present.map((s) => [s.name, '[REDACTED]']));
    if (present.length === 0) {
      console.log('would run: nothing to send (all values missing).');
    } else if (bulk) {
      console.log('would run: wrangler secret bulk --name ' + worker + '  < stdin JSON payload:');
      console.log('  ' + JSON.stringify(preview));
    } else {
      for (const s of present) {
        console.log('would run: wrangler secret put ' + s.name + ' --name ' + worker + '  < stdin value (redacted)');
      }
    }
    appendAudit(auditPath, { ts: new Date().toISOString(), worker, names: present.map((s) => s.name), mode: 'dry-run', result: missing.length > 0 ? 'missing-values' : 'ok', transport: bulk ? 'bulk' : 'put', wrangler: version });
    console.log(`audit: ${auditPath}`);
    console.log('dry run complete — no secrets were sent. Re-run with --yes to push.');
    return;
  }

  // ── Real push (--yes). Values never reach argv or the log. ──────────
  if (missing.length > 0) {
    console.error(`mirror-secrets: refusing partial push — missing: ${missing.map((s) => s.name).join(', ')}`);
    appendAudit(auditPath, { ts: new Date().toISOString(), worker, names: present.map((s) => s.name), mode: 'push', result: 'refused-missing-values' });
    process.exit(1);
  }
  const payload = Object.fromEntries(present.map((s) => [s.name, s.value]));
  let ok = false;
  let mode = bulk ? 'bulk' : 'put';
  let err = '';
  if (bulk) {
    const r = run(WRANGLER, ['secret', 'bulk', '--name', worker], JSON.stringify(payload));
    ok = r.ok;
    err = r.err;
    if (!ok && /unknown|unrecognized|not found/i.test(`${r.err}${r.out}`)) {
      // Bulk existed at probe time but this wrangler rejects it — fall back.
      mode = 'put';
      ok = putLoop(worker, present);
      err = '';
    }
  } else {
    ok = putLoop(worker, present);
  }
  if (ok) {
    console.log(`mirror-secrets: pushed ${present.length} secret(s) to ${worker} via ${mode} — values not shown.`);
  } else {
    console.error(`mirror-secrets: push failed (${mode}) — ${scrub(err || 'wrangler exited non-zero', values)}`);
  }
  appendAudit(auditPath, { ts: new Date().toISOString(), worker, names: present.map((s) => s.name), mode: 'push', result: ok ? 'ok' : 'failed', transport: mode, wrangler: version });
  process.exit(ok ? 0 : 1);
}

function putLoop(worker, present) {
  for (const s of present) {
    const r = run(WRANGLER, ['secret', 'put', s.name, '--name', worker], s.value);
    if (!r.ok) return false;
  }
  return true;
}

/** If stdin is piped, read it all and parse as JSON { NAME: value }.
 *  Returns null when stdin is a TTY or unparseable (values stay MISSING). */
function readStdinJson() {
  if (process.stdin.isTTY) return null;
  try {
    // stdin of a script can be a pipe; read it fully, synchronously, via fd 0.
    const data = readFileSync(0, 'utf8');
    return data && data.trim() ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function appendAudit(path, entry) {
  try {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    chmodSync(dirname(path), 0o700);
    appendFileSync(path, JSON.stringify(entry) + '\n', { mode: 0o600 });
  } catch (e) {
    console.error(`mirror-secrets: audit write failed: ${e.message}`);
  }
}

main(process.argv);