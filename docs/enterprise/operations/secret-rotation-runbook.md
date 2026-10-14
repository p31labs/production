<!-- P31-HEADER
id: p31_secret_rotation_runbook_20261013_v1.0
type: runbook
component: enterprise-operations
status: live
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# Secret Rotation Runbook — P31 Estate

**Owner-executed. Last reviewed: 2026-10-13.** Applies to every Cloudflare
Workers secret in the estate: the gateway `LOVE_AUTH_SECRET`, any worker
secret, and the p31-key-rotator worker's own `ROTATOR_SHARED_SECRET`.

## Who runs this

- **The owner (will) executes every production rotation.** No agent, cron
  trigger, or Worker may rotate a production secret.
- Agents may only exercise the mechanics against a **test secret name**
  (`P31_ROTATOR_SMOKE`) and must remove it afterwards.
- The `~/.wrangler/config/default.toml` OAuth session is the machine
  credential that `wrangler secret put` uses. It never leaves the owner's
  machine.

## Tooling

| Tool | Path | Role |
|---|---|---|
| Keygen + rotator CLI | `scripts/key-rotate.mjs` | Zero-dep Node 24: generate keys, backup the listing, put the new value, verify, print the window summary. |
| Companion Worker | `workers/p31-key-rotator` | Zero-dep Worker: `GET /health`, shared-secret-gated `POST /genkey` + `POST /rotate` that return keys + instructions. It **cannot** run `wrangler secret put` and says so. |
| Backup store | `<ops-dir>/.secret-backups/` | JSON records of the listing at rotation time (0600, gitignored). |
| Mirror CLI | `scripts/mirror-secrets.mjs` + `scripts/mirror-secrets*.manifest.json` | Zero-dep Node 24: push manifest-driven values via `wrangler secret bulk` (fallback: per-secret put). Dry-run by default; values via env/dotenv/stdin only; audit lines in `.secret-mirror/audit.log`. See §Secrets Store migration below and `docs/enterprise/operations/secrets-inventory.md`. |

Key format everywhere: 32 bytes from `crypto.getRandomValues`, RFC 4648
base64url, unpadded (43 chars).

## Preconditions

1. `wrangler whoami` shows the owner account and `workers (write)` scope.
2. The **current value** is stored in the owner vault (password manager).
   The Cloudflare API never returns secret values — if the current value
   is not in the vault, rotation is blocked until the consumer is checked.
3. The consumer of the secret (gateway, caller service) accepts **two
   values at once** during the transition window (dual-credential mode).
4. Consumers have their clocks sane (the window uses timestamps).

## Procedure — dual-credential rotation

1. **Preflight.** `wrangler whoami`. Record the current value in the
   vault. Confirm the consumer's dual-credential slot is free.
2. **Generate.** `node scripts/key-rotate.mjs keygen` — or
   `POST /rotate` on the worker with the shared-secret token for a key
   plus instructions.
3. **Backup.** `node scripts/key-rotate.mjs backup <NAME> --worker <W>` —
   captures the secret listing honestly (names + metadata; values are
   never returned). If the session does not permit listing, the returned
   error is recorded verbatim in the backup file.
4. **Put.**
   `node scripts/key-rotate.mjs rotate <NAME> --worker <W> --value @vault-file --yes [--health <url>]`
   The value travels via **stdin only** (argv is visible in `ps`). The
   CLI refuses to put without `--yes`.
5. **Window opens.** Immediately add the new value to the consumer's
   dual-credential slot — **old + new both accepted**. Default window:
   **24 hours** (override with `--window-hours` for planned maintenance).
6. **Verify during the window.** Watch consumer logs: both old and new
   callers succeed. `--health` on the CLI checks the worker is serving;
   it does not read the secret back (the API cannot).
7. **Drop the old value.** After the window, remove the old value from
   the consumer, then monitor failures for the next hour.
8. **Record.** Keep the backup file and note the completion in the
   operations log. Rotate again at the cadence in the secret inventory.

## Rollback path

If the new value fails during the window:

1. Re-put the previous value from the owner vault:
   `node scripts/key-rotate.mjs rotate <NAME> --worker <W> --value <OLD_VALUE> --yes`
2. Disable the new value in the consumer's dual-credential slot.
3. Re-verify consumers; keep the failed value's fingerprint in the backup
   file as the audit trail.

Rollback is always possible **only because the old value lives in the
vault** — the backup file stores the listing and a sha256 fingerprint,
never the value itself (Cloudflare will not give it back).

## Transition-window policy

- **Default: 24h.** Both credentials accepted; old dropped after.
- **Shorter (min 1h)** only for emergency compromise rotation, with the
  consumer switched to the new value immediately.
- **Longer (max 72h)** for estate-wide rotations with many consumers.
- A rotation is never "instant" — plan the window around traffic.

## Automation boundary (honest)

Automated today: key generation, listing backup, the put itself, health
verification, window arithmetic, rollback instructions — all inside
`scripts/key-rotate.mjs`, executed **by the owner on the owner's
machine**.

Not automated, owner-executed: the decision to rotate, the production
execution, the consumer's dual-credential configuration, and the old-value
drop. The companion Worker returns instructions only; it has no OAuth
session and cannot rotate anything, and it says so in every /rotate
response. A cron trigger could schedule keygen reminders, but must never
auto-rotate.

## Secrets Store — account-level migration

**Owner-executed. Last reviewed: 2026-10-14.** The Cloudflare **Secrets
Store** replaces per-worker `wrangler secret` for the estate's shared
secrets: create the secret **once at the account level**, bind it to every
Worker that needs it, and **one rotation updates every bound Worker** — no
per-worker puts, no drift between the gateway and the ledger.

### Where we are today

- `LOVE_AUTH_SECRET` is **already** a Secrets Store secret
  (`store_id 33d48162fd6842869beeed3516e2909c`), bound by the gateway at
  `workers/mcp-x402-gateway/wrangler.toml:63-66` and resolved at runtime
  via `await env.LOVE_AUTH_SECRET.get()` (the `resolveSecret` shim in
  `src/love-auth.ts:21-25` accepts both the store binding and a plain
  string, so the same code works locally).
- `ROTATOR_SHARED_SECRET` is still a per-worker `wrangler secret` on
  `p31-key-rotator` — the migration target.

### Migration procedure (owner-executed)

1. **Create the store secret (once).** In the Cloudflare dashboard
   (Workers → Secrets Store) or via wrangler with a Secrets-Store-scoped
   credential: create `ROTATOR_SHARED_SECRET` in the same account-level
   store. **Owner:** the box credential without the Secrets Store scope
   cannot do this (`wrangler secrets-store` → error 10000); use the
   IP-locked `p31-gateway-deploy` token or the dashboard.
2. **Bind it.** Add `[[secrets_store_secrets]]` with
   `binding = "ROTATOR_SHARED_SECRET"`, the `store_id`, and
   `secret_name` to `workers/p31-key-rotator/wrangler.toml` — the exact
   pattern the gateway uses (`wrangler.toml:63-66`). Resolve at runtime
   with `env.ROTATOR_SHARED_SECRET.get()` (or a plain-string-compatible
   shim like `resolveSecret`).
3. **Mirror the value in.** `node scripts/mirror-secrets.mjs --manifest
   scripts/mirror-secrets.p31-key-rotator.manifest.json --yes` (or
   `wrangler secret bulk` directly). **Owner-executed**, value via env or
   stdin only.
4. **Local parity.** `.dev.vars` (gitignored) carries the same names for
   `wrangler dev`; Secrets Store bindings are not available locally, so
   the consumer must accept the plain string (the gateway pattern
   already does).
5. **Deprecate the per-worker secret.** After verification, delete the old
   `wrangler secret` on the worker so there is exactly one source of
   truth. **Owner-executed.**

### Dual-credential window (prepare → propagate → verify → deactivate → record)

The store holds **one value per name**, so the dual-credential transition
lives on the **consumer** side, not the store side:

1. **Prepare.** `node scripts/key-rotate.mjs keygen` (new value). Record
   the **current** value in the owner vault first — the store is
   zero-read, and the old value cannot be recovered after the put.
   Confirm the consumer's dual-credential slot is free.
2. **Propagate.** Put the new value into the store (mirror CLI or
   `wrangler secret bulk`). Every bound Worker now resolves the new
   value; the consumer (renderer, ledger) adds the new value to its
   **old + new both accepted** slot within the window.
3. **Verify during the window.** Watch consumer logs: both old and new
   callers succeed. `scripts/legc-smoke.mjs` re-proves the gateway path
   end-to-end for the new value (C1–C5; see
   `docs/fix-plans/p31ca-secrets-automation-2026-10-14.md`).
4. **Deactivate.** After the window (default 24h), drop the old value
   from the consumer's slot and monitor failures for the next hour.
5. **Record.** Audit line in `.secret-mirror/audit.log` (timestamp,
   names, worker — no values), the backup file from `key-rotate.mjs
   backup`, and a note in the operations log. Next rotation at the
   cadence in `docs/enterprise/operations/secrets-inventory.md`.

All five steps are **owner-executed**. Agents may exercise the mechanics
only against test secret names (`P31_ROTATOR_SMOKE`) and must remove
them afterwards.

## The future path (documented, not wired)

Post-quantum **signing** keys (ML-DSA-65 + Ed25519 hybrid) can come from
the p31-crypto MCP server (`pqc_keygen`). That is a separate signing-key
path; this runbook's symmetric secrets are unchanged. Wiring is deferred —
see `docs/fix-plans/p31-key-rotator-2026-10-13.md`.