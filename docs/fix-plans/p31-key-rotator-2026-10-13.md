# fix: In-house key creator/rotator — Lane 2 of the visual/nav + rotator wave

<!-- P31-HEADER
id: p31_fix_plan_key_rotator_20261013_v1.0
type: fix-plan
component: workers
status: resolved
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

## Symptom

The estate had no in-house key creation/rotation path: no keygen, no
rotator CLI, no companion Worker, and no secret-rotation runbook. The
gateway `LOVE_AUTH_SECRET` (and every worker secret) would have to be
rotated by hand with ad-hoc commands, with no honest backup record, no
dual-credential transition-window policy, and no rollback path. This is
Lane 2 of the 2026-10-13 wave (STATE.md "In Flight").

Files: `scripts/key-rotate.mjs`, `workers/p31-key-rotator/src/index.ts`,
`workers/p31-key-rotator/wrangler.toml`,
`workers/p31-key-rotator/README.md`, `workers/p31-key-rotator/.gitignore`,
`docs/enterprise/operations/secret-rotation-runbook.md`.

## Evidence (pre-fix)

```bash
ls scripts/key-rotate.mjs workers/p31-key-rotator            # → No such file (before this turn)
ls docs/enterprise/operations/                               # → monitoring.md, slos.md, marketplace-production-hardening.md only
```

## The fix

1. **Keygen** — `scripts/key-rotate.mjs:68` `generateKey()`: 32 bytes from
   `crypto.getRandomValues` (built-in Web Crypto), RFC 4648 base64url
   unpadded (43 chars). Zero-dep plain Node 24; no install, no lockfile.
2. **Rotator CLI** — `scripts/key-rotate.mjs`:
   - `backup` → `backup()` at line 116: runs
     `wrangler secret list --name <worker>` (line 120) and writes
     `.secret-backups/<NAME>-<ts>.json` (0600) with the listing captured
     **verbatim, including "listing not permitted" API responses** — the
     honest record. The file never holds a secret value (the API never
     returns one).
   - `rotate` → `cmdRotate()` at line 207: backup (1/4), then
     `wrangler secret put` (line 232) with the value piped via **stdin
     only** (argv is visible in `ps`), then `--health` verification, then
     the dual-credential window summary + rollback instructions
     (`printWindowSummary()` line 162).
   - **Safety gate** at line 210: refuses to put without `--yes`
     (`process.exit(2)` at line 214); `--dry-run` exercises backup +
     verification without touching Cloudflare. Production rotation is
     owner-executed — printed on every abort and in the runbook.
3. **Companion Worker** — `workers/p31-key-rotator/src/index.ts`
   (zero-dep, same pattern as `workers/p31-rum`; no package.json, no
   node_modules, no lockfile):
   - `GET /health` (line 157): liveness + `secret_provisioned`, never the
     value.
   - `POST /genkey` / `POST /rotate` (lines 170–177) behind
     `authGate()` (line 97): header `X-Rotator-Token` vs the Worker secret
     `ROTATOR_SHARED_SECRET` (owner-set, never hardcoded), constant-time
     compare (`constantTimeEqual()` line 71), 503 when not provisioned.
   - `/rotate` returns a generated key + operator instructions
     (`rotationInstructions()` line 122) and states the honest boundary:
     the Worker never calls `wrangler secret put` because it has no OAuth
     session; the put must run from the owner's machine.
4. **Runbook** — `docs/enterprise/operations/secret-rotation-runbook.md`:
   dual-credential procedure (both old+new accepted during the window,
   old dropped after), backup/rollback path (old value from the owner
   vault — the API never returns values), 24h default transition-window
   policy, owner-executed boundary, cron/keygen-reminder option, and the
   ML-DSA-65 future path (documented, not wired — `pqc_keygen` on the
   p31-crypto MCP server).

## Dry-run evidence (all against the TEST secret name `P31_ROTATOR_SMOKE`)

No production secret was touched at any point. The test secret was put,
listed, rotated, and **removed**. The worker was deployed as the target
(it is the new in-scope worker).

```bash
# Session: owner OAuth, workers (write) scope
$ wrangler whoami
#   → OAuth Token, email trimtab.signal@proton.me, account ee05f70c…
#   → workers (write), workers_scripts (write), d1 (write), pages (write) …

# Keygen (Web Crypto, 43-char base64url)
$ node scripts/key-rotate.mjs keygen --count 1
#   → fDPTY30kJdXqrJc32PGRpKPRg7_SEqzCOgb6lrSTMME	sha256:8v1tnMrwt-… (43 chars)

# Abort gate: no --yes → exit 2, nothing run
$ node scripts/key-rotate.mjs rotate P31_ROTATOR_SMOKE --worker p31-key-rotator; echo exit=$?
#   → "refusing to rotate … without --yes. … owner-executed."  exit=2

# Deploy companion worker
$ cd workers/p31-key-rotator && wrangler deploy
#   → Uploaded p31-key-rotator (4.37 sec) → https://p31-key-rotator.trimtab-signal.workers.dev

# Health + auth gate (secret not yet owner-set → 503, per design)
$ curl -s https://p31-key-rotator.trimtab-signal.workers.dev/health
#   → {"ok":true,"service":"p31-key-rotator","ts":1791934220943,"secret_provisioned":false}
$ curl -s -o /dev/null -w '%{http_code}\n' -X POST https://p31-key-rotator.trimtab-signal.workers.dev/genkey
#   → 503

# TEST put (test secret name only)
$ printf 'smoke-old-value-01' | wrangler secret put P31_ROTATOR_SMOKE --name p31-key-rotator
#   → 🌀 Creating the secret for the Worker "p31-key-rotator"
#   → ✨ Success! Uploaded secret P31_ROTATOR_SMOKE
$ wrangler secret list --name p31-key-rotator
#   → [ { "name": "P31_ROTATOR_SMOKE", "type": "secret_text" } ]

# CLI backup (listing captured honestly)
$ node ../../scripts/key-rotate.mjs backup P31_ROTATOR_SMOKE --worker p31-key-rotator
#   → [backup] listing captured
#   → [backup] wrote …/workers/p31-key-rotator/.secret-backups/P31_ROTATOR_SMOKE-2026-10-13T23-30-35-384Z.json (0600)

# CLI dry-run (backup + verify only, put skipped)
$ node ../../scripts/key-rotate.mjs rotate P31_ROTATOR_SMOKE --worker p31-key-rotator \
    --value smoke-new-value-02 --dry-run --health https://p31-key-rotator.trimtab-signal.workers.dev/health
#   → [1/4] backing up …  [2/4] [dry-run] would put …  [3/4] GET …/health → HTTP 200 (worker up)
#   → [4/4] Dual-credential window: 24h, old dropped after 2026-10-14T23:30:37.362Z; rollback cmd printed
#   → [dry-run] nothing was written to Cloudflare.

# CLI real rotate with --yes (TEST secret)
$ node ../../scripts/key-rotate.mjs rotate P31_ROTATOR_SMOKE --worker p31-key-rotator \
    --value smoke-new-value-02 --yes --health https://p31-key-rotator.trimtab-signal.workers.dev/health
#   → [2/4] put ok (value sha256 J9f5JNyMtXmE_ZjjJDBYixw2xW6FhAIjA3P15PrlQFA).
#   → [3/4] GET …/health → HTTP 200 (worker up)
#   → [4/4] Window: 24h … After: the old value is DROPPED and rejected.
#   → Rollback: node scripts/key-rotate.mjs rotate … --value <OLD_VALUE_FROM_VAULT> --yes
$ wrangler secret list --name p31-key-rotator
#   → [ { "name": "P31_ROTATOR_SMOKE", "type": "secret_text" } ]   (still present after rotate)

# Cleanup: test secret removed
$ printf 'smoke-new-value-02\nsmoke-new-value-02\n' | wrangler secret delete P31_ROTATOR_SMOKE --name p31-key-rotator
#   → ✨ Success! Deleted secret P31_ROTATOR_SMOKE
$ wrangler secret list --name p31-key-rotator
#   → []
```

Backup-file honesty check (from the dry run): the file records
`listing_ok`, `listing_status`, raw `listing_stdout`/`listing_stderr`, and
`honest_note` — "The Cloudflare API returns secret NAMES and metadata
only — it never returns secret values." No secret value is stored in any
backup file.

## Dual-credential policy (adopted)

For 24h after a put, the gateway/consumer accepts **both** the old and
the new value; after the window the old value is dropped and rejected.
Default 24h, min 1h (compromise rotation), max 72h (estate-wide).
Rollback = re-put the old value from the owner vault — possible only
because the vault holds it; the API will not return it.

## Owner-executed vs automated

- **Automated (owner's machine, owner's session):** keygen, listing
  backup, `wrangler secret put` (stdin-only), health verify, window
  arithmetic, rollback instructions — `scripts/key-rotate.mjs`.
- **Owner-executed, never automated:** the decision to rotate, production
  execution (`LOVE_AUTH_SECRET` etc.), the consumer's dual-credential
  configuration, the old-value drop. The Worker returns instructions
  only; it has no OAuth session and cannot rotate anything — stated in
  every `/rotate` response and in `workers/p31-key-rotator/README.md`.

## Why it is not done yet

Resolved this turn (Lane 2 built + dry-run only, per lane scope). The
real `LOVE_AUTH_SECRET` rotation is **owner-executed** and pending the
owner telling us where the secret lives (STATE.md "NEW OWNER FACT").
Remaining owner actions, in order: (1) set
`ROTATOR_SHARED_SECRET` on `p31-key-rotator` (one `wrangler secret put`);
(2) confirm the gateway's dual-credential support; (3) pick a window and
run the runbook's procedure for `LOVE_AUTH_SECRET`; (4) decide whether a
cron reminder for keygen cadence is wanted (rotation itself stays manual).
Future path filed here: ML-DSA-65 signing keys via p31-crypto MCP
`pqc_keygen` — documented, deliberately not wired.