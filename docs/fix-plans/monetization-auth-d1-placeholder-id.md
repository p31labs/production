<!-- P31-HEADER
id: p31_fix_plan_monetization_auth_d1_placeholder_id_20261014_v1.0
type: fix-plan
component: monetization
status: resolved
retention: keep-forever
created: 2026-10-14T00:00:00Z
owner: will
-->

# fix-plan: monetization AUTH_DB binding ships a placeholder D1 id

## Symptom

`monetization/wrangler.toml:68` declares the auth D1 binding with
`database_id = "REPLACE_ME_WITH_D1_ID"`. `wrangler deploy` fails validation on
a non-UUID D1 id, so the committed config cannot deploy as-is. The live portal
(`p31-monetization.trimtab-signal.workers.dev`) must be running a patched
config that diverges from the repo.

The binding backs passkey persistence and OAuth 2.1 session state
(`src/worker.ts` guards `env.AUTH_DB` and binds `createD1PasskeyStore` only
when present), so passkeys currently fall back to in-memory storage — they are
lost on isolate recycle.

## Evidence

- `monetization/wrangler.toml:65-69` —
  `[[d1_databases]] binding = "AUTH_DB" … database_id = "REPLACE_ME_WITH_D1_ID"`.
- `src/worker.ts` — `if (env.AUTH_DB && !d1PasskeyStoreBound)` binds the D1
  passkey store; `recordOAuth21Issuance` writes to `env.AUTH_DB` when present.
- `migrations/0001_auth.sql` defines `passkeys` + `oauth_token_issuances`
  (not applied anywhere per this config).

## Root cause

The repo convention is to run `wrangler d1 create p31-monetization-auth` and
paste the returned UUID into `wrangler.toml`; that step was never completed
(the comment at wrangler.toml:62-64 documents it).

## Fix

1. `wrangler d1 create p31-monetization-auth` (or reuse an existing
   `p31-monetization-auth` DB) and paste the real UUID into `wrangler.toml`.
2. `wrangler d1 execute p31-monetization-auth --remote --file=migrations/0001_auth.sql`.
3. Redeploy the portal from the committed config so repo == deployed.
4. Optionally add a config gate (like `REPLACE_ME|TODO` scanning) so no
   placeholder UUID can be committed.

## Verification

- `wrangler deploy --dry-run` from `monetization/` passes config validation.
- `pnpm gate` green after the change.
- Passkey registration survives an isolate recycle (register → wait → login
  with the same credential) against the live portal.

## Impact

Blocks reproducible deploys of the portal; passkey auth persistence is
silently un-wired (auth works per-request but registrations are ephemeral).

## Not blocking

RBAC role tokens (HS256, `ROLE_JWT_SECRET`) and Cloudflare Access fallback do
not depend on AUTH_DB.

## Progress (2026-10-14)

Blocked on Cloudflare credentials in this environment (`wrangler whoami`
unavailable, so `wrangler d1 create` cannot run). The placeholder remains
documented in `wrangler.toml:68` with the required command. Owner step: create
`p31-monetization-auth`, paste the UUID, apply `migrations/0001_auth.sql`, and
redeploy from the committed config. Optionally add a placeholder gate to CI.

## Resolution (2026-10-15)

- `scripts/d1-auth-bootstrap.mjs` automates the whole step (create if missing,
  patch placeholder, apply migration; idempotent). Wired as
  `pnpm bootstrap:auth-d1`.
- Executed: `p31-monetization-auth` created (uuid `ecb91dbf-…`), placeholder
  replaced in `wrangler.toml`, `migrations/0001_auth.sql` applied.
- Portal redeployed with `AUTH_DB: p31-monetization-auth (ecb91dbf-…)` binding
  confirmed in the deploy output (2026-10-15); passkey persistence is now live.