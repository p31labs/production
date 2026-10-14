# fix: OAuth 2.1 provider swap (workers-oauth-provider) pending coordinated install wave

<!-- P31-HEADER
id: p31_fix_plan_monetization_oauth21_provider_swap_20261011_v1.0
type: fix-plan
component: monetization
status: open
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`monetization/docs/ZERO-TRUST.md` §4 step 1 calls for replacing the bespoke
HS256 issuance/verification with `@cloudflare/workers-oauth-provider` (the
Workers-first OAuth 2.1 provider). The 2026-10-11 hardening workstream
implemented steps 2–3 (RFC 8707 audience binding in `src/lib/oauth21.ts`) and
the D1 gate (passkey store + issuance audit), but the provider package itself
cannot be added yet.

## Evidence

- `monetization/package.json` — `@cloudflare/workers-oauth-provider` absent.
- HARD RULE: no `pnpm install` under `/home/p31/production` (shared lockfile,
  coordinated later). Adding the dependency without the install wave would
  either fail `tsc --noEmit` (importing an uninstalled module) or silently
  drift `package.json` from `pnpm-lock.yaml`.
- `src/lib/oauth21.ts` — HS256 + RFC 8707 `aud` implemented with WebCrypto
  only, flagged by `OAUTH21_ENABLED` (default off).

## Plan (run during the coordinated install wave)

1. Add `"@cloudflare/workers-oauth-provider"` to `monetization/package.json`
   dependencies and run the coordinated `pnpm install`.
2. Port issuance/verification to the provider: authorization-code flow with
   PKCE, D1-backed `oauth_codes` table (extend `migrations/0001_auth.sql` via
   a new migration), keep `sub` = did:key and the `viewer`/`operator`/`admin`
   role claims as scopes or a role claim per ZERO-TRUST.md §4.
3. Replace the `OAUTH21_ENABLED` flag path in `src/worker.ts` with the
   provider's handlers once parity tests pass; drop the legacy
   `verifyRoleToken` fallback in the RBAC gate after reissuing CI tokens.
4. Update `docs/ZERO-TRUST.md` §4 step 4 → done; retire this fix-plan.

## Not in scope

- `src/roles.ts` stays untouched through the migration (doc contract).
- Cloudflare Access JWT validation (`src/lib/accessJwt.ts`) is unchanged.