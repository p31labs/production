# fix: secrets/ops lane — mirror automation, Secrets Store guide, leg-C smoke, Access prep

<!-- P31-HEADER
id: p31ca_secrets_automation_20261014_v1.0
type: fix-plan
component: enterprise-operations
status: open
retention: keep-forever
created: 2026-10-14T00:00:00Z
owner: will
-->

## Scope

Runbook §7 / Lane 3 (secrets/ops), D3+D4: prepare the estate's secrets
architecture for the Secrets Store without touching production values.
**No secret was rotated or placed.** Scripts + docs + gateway-binding
documentation only; the gateway's code and deploy are untouched (owner-go
required for any redeploy, per `p31-fix-plan-gateway-deploy-secrets-store-scope.md`).

## What shipped

| Artifact | Role |
|---|---|
| `scripts/mirror-secrets.mjs` (new) | Zero-dep secret mirror: manifest (name + source: `gha` env / `envrc` / `env` / `stdin`) → `wrangler secret bulk` (fallback per-secret `secret put`, values via stdin only). **Dry-run is the default**; a push requires `--yes`. Values never printed (output scrubbed), never in argv, never logged. Audit lines (ts, worker, names, mode, result — no values) appended to `.secret-mirror/audit.log` (0600; gitignored via `.gitignore:23` `*.log`). |
| `scripts/mirror-secrets.manifest.json` (new) | Gateway manifest: `LOVE_AUTH_SECRET`, `ENTITLEMENT_API_TOKEN` (source `gha`, envNames `CF_*`). Names only — no values. |
| `scripts/mirror-secrets.p31-key-rotator.manifest.json` (new) | Rotator manifest: `ROTATOR_SHARED_SECRET`. Names only — no values. |
| `scripts/legc-smoke.mjs` (new) | Leg C: the LOVE-settled **paid** path through the gateway (the leg `cbs-settlement-smoke.mjs` skipped). Secret from env/stdin only; never stored; sha256 fingerprint printed for attribution. |
| `docs/enterprise/operations/secrets-inventory.md` (new) | The key inventory table: `LOVE_AUTH_SECRET`, `ROTATOR_SHARED_SECRET`, `ENTITLEMENT_API_TOKEN`, `CF_ACCESS_APP_AUD`, `CF_ACCESS_TEAM_NAME`, `cf-gateway-deploy.token` — owners + cadence + storage location. |
| `docs/enterprise/operations/secret-rotation-runbook.md` (extended) | New §"Secrets Store — account-level migration": create-once/bind-everywhere, `.dev.vars` local parity, dual-credential window (prepare → propagate → verify → deactivate → record), all steps owner-executed. Tooling table now lists the mirror CLI. |
| `docs/enterprise/operations/access-middleware-prep.md` (new) | Cloudflare Access Pages plugin (`@cloudflare/pages-plugin-cloudflare-access`, `domain = https://<CF_ACCESS_TEAM_NAME>.cloudflareaccess.com`, `aud = CF_ACCESS_APP_AUD`) scaffold following the existing `portals/workspace/functions/_middleware.ts:16-28` pass-through pattern; governed-surface inventory; owner dashboard checklist. |

## Gateway binding (documented, read-only)

`workers/mcp-x402-gateway/wrangler.toml:63-66` — `[[secrets_store_secrets]]`
binds `LOVE_AUTH_SECRET` from account-level store
`33d48162fd6842869beeed3516e2909c`, resolved at runtime via
`await env.LOVE_AUTH_SECRET.get()` (`src/love-auth.ts:21-25` accepts the
store binding or a plain string). **No gateway file was changed; no
redeploy without owner go.**

## Evidence — mirror dry-run (values absent)

`node scripts/mirror-secrets.mjs --manifest scripts/mirror-secrets.manifest.json`:

```
mirror-secrets: DRY RUN — worker mcp-x402-gateway
manifest: scripts/mirror-secrets.manifest.json
wrangler: 4.112.0 — secret bulk SUPPORTED
plan:
  LOVE_AUTH_SECRET         gha:CF_LOVE_AUTH_SECRET  MISSING
  ENTITLEMENT_API_TOKEN    gha:CF_ENTITLEMENT_API_TOKEN MISSING
missing: LOVE_AUTH_SECRET, ENTITLEMENT_API_TOKEN (set the env var / dotenv entry / stdin value, then re-run)
would run: nothing to send (all values missing).
audit: /home/p31/production/.secret-mirror/audit.log
dry run complete — no secrets were sent. Re-run with --yes to push.
```

Same for the rotator manifest (`ROTATOR_SHARED_SECRET` MISSING, bulk
SUPPORTED, no values sent). Wrangler on the box is **4.112.0**, which
supports `wrangler secret bulk` (verified via `wrangler secret bulk
--help`; stdin JSON payload, `--name <worker>`).

## Evidence — mirror dry-run with fake values (redaction proof)

With `CF_LOVE_AUTH_SECRET`/`CF_ENTITLEMENT_API_TOKEN` set to fake strings
(not real secrets):

```
plan:
  LOVE_AUTH_SECRET         gha:CF_LOVE_AUTH_SECRET  PRESENT •••••••••••••••••••••••• (50 chars)
  ENTITLEMENT_API_TOKEN    gha:CF_ENTITLEMENT_API_TOKEN PRESENT •••••••••••••••••••••••• (26 chars)
would run: wrangler secret bulk --name mcp-x402-gateway  < stdin JSON payload:
  {"LOVE_AUTH_SECRET":"[REDACTED]","ENTITLEMENT_API_TOKEN":"[REDACTED]"}
```

`env`, `envrc`, and `stdin` sources each resolved correctly; audit lines
landed in `.secret-mirror/audit.log` with names only.

## Evidence — leg-C negative control (no real secret used)

`LOVE_AUTH_SECRET` unset → script refuses, exit 2 (instructions printed).
With a **fake** secret against the deployed gateway (401s only — no
settlement, no mutation):

```
PASS  C1 gateway /health 200 — HTTP 200 service=mcp-x402-gateway
FAIL  C2 paid LOVE tools/call settles … — HTTP 401 {"error":"Invalid LOVE settlement auth"}
PASS  C3 bad HMAC rejected → 401 — HTTP 401
PASS  C4 missing HMAC headers rejected → 401 — HTTP 401
PASS  C5 valid MAC, stale timestamp → 401 (TTL enforced) — HTTP 401

LEG C SMOKE: FAIL (1)
```

This is the designed fail-closed posture: C1 proves the gateway is live
and the HMAC gate is active; C2 proves a fake secret cannot settle
(`Invalid LOVE settlement auth`); C3–C5 prove the negative controls the
script asserts. With the real secret, C2 becomes the settlement evidence
(200 = gateway blinded + ledger signed + bridge verified both challenges
+ consumed the single-use coin per `docs/specs/love-settlement-cbs.md` §5,
`bridge/src/cbs-verify.mjs:90-136`).

## Key inventory (condensed — full table in `docs/enterprise/operations/secrets-inventory.md`)

| Secret | Location | Owner | Cadence |
|---|---|---|---|
| `LOVE_AUTH_SECRET` | Secrets Store `33d48162…` (bound at gateway `wrangler.toml:63-66`, zero-read) | will | 90d, dual-credential 24h window |
| `ROTATOR_SHARED_SECRET` | per-worker wrangler secret → migrate to store | will | 180d |
| `ENTITLEMENT_API_TOKEN` | per-worker wrangler secret on gateway | will | 90d |
| `CF_ACCESS_APP_AUD` / `CF_ACCESS_TEAM_NAME` | Pages env vars (not secrets) | will | provision-once, rotate on compromise |
| `cf-gateway-deploy.token` | `/home/p31/.secrets/` (0600, IP-locked `p31-gateway-deploy`) | will | 90d or on scope change |

## Owner-executed checklist

1. Populate the Secrets Store / mirror the values: run the mirror with
   `--yes` per manifest (value via env/stdin only), or place
   `ROTATOR_SHARED_SECRET` in the store and bind it in
   `workers/p31-key-rotator/wrangler.toml` (gateway pattern,
   `wrangler.toml:63-66`).
2. Run leg C with the real secret:
   `LOVE_AUTH_SECRET=<secret> node scripts/legc-smoke.mjs` → expect
   `LEG C SMOKE: PASS` (C1–C5). This closes the leg-C blocker in
   `STATE.md` and the open item in
   `p31-fix-plan-gateway-deploy-secrets-store-scope.md`.
3. Deprecate the old per-worker `ROTATOR_SHARED_SECRET` wrangler secret
   after the store binding verifies (one source of truth).
4. Access activation per `access-middleware-prep.md` §Owner activation
   checklist (dashboard; set the two env vars per surface; deploy once;
   verify redirect + curl 401 negative control).
5. CI wiring: add the GitHub Actions job that exports the `CF_*` repo
   secrets into env and calls `mirror-secrets.mjs --yes` for the
   manifests above (self-healing deploys); record it in the ops log.
6. Re-run the cadence entries in `secrets-inventory.md` at their
   intervals; every rotation follows the runbook's dual-credential
   window.
7. **D7 commit note:** `.gitignore:18` (`secret*`) silently ignores
   `docs/enterprise/operations/secret-rotation-runbook.md` (pre-existing,
   already untracked) and the new `docs/enterprise/operations/secrets-inventory.md`.
   The tree commit must force-add both (`git add -f
   docs/enterprise/operations/secret-rotation-runbook.md
   docs/enterprise/operations/secrets-inventory.md`) or the runbook edits
   and inventory never land.

## Open items

- Leg C real run (owner, item 2 above) — requires the plaintext
  `LOVE_AUTH_SECRET` (store is zero-read; owner vault).
- `ROTATOR_SHARED_SECRET` store migration (item 1) — needs a
  Secrets-Store-scoped credential (the IP-locked `p31-gateway-deploy`
  token or the dashboard).
- Access activation (item 4) — dashboard-only, no code change needed
  beyond setting the two env vars per surface.