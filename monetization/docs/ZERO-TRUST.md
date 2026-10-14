# P31 Capital Machine — Zero Trust Runbook

This document covers the three enterprise-auth capabilities added to the portal
worker (`src/worker.ts`): passkeys (WebAuthn), Cloudflare Access JWT validation,
and the OAuth 2.1 / RFC 8707 migration path. It is the operational companion to
`docs/SECURITY.md` (credential rotation and least-privilege).

## 1. Capability map

| Capability | Code | Routes / hooks |
|---|---|---|
| Passkeys (SimpleWebAuthn → DID) | `src/lib/passkeys.ts` + `src/lib/passkeyStore.ts` (D1) | `POST /api/webauthn/register/{options,verify}`, `POST /api/webauthn/login/{options,verify}` |
| Cloudflare Access JWT validation | `src/lib/accessJwt.ts` | RBAC gate on `ADMIN_ROUTES` and `OPERATOR_ROUTES` |
| OAuth 2.1 / RFC 8707 role tokens | implemented behind `OAUTH21_ENABLED` flag — `src/lib/oauth21.ts` (+ `src/lib/oauthSessionStore.ts`) | `/api/auth/token`, `/api/webauthn/login/verify`, RBAC gate; `src/roles.ts` unchanged |

All three run inside `src/worker.ts`, the portal worker proxying `/api/*` to
service bindings. Existing role-token RBAC is unchanged and remains the
authoritative path for write routes.

## 2. Passkeys (WebAuthn → DID)

The worker implements a four-route WebAuthn flow with `@simplewebauthn/server`:

1. `POST /api/webauthn/register/options` — body `{ did, username? }`. Returns a
   `PublicKeyCredentialCreationOptionsJSON` challenge. RP ID is derived from the
   worker host (`new URL(request.url).hostname`).
2. `POST /api/webauthn/register/verify` — body `{ did?, response }`. Verifies
   the attestation (origin, RP ID, challenge, signature) and stores the
   credential bound to the registration-time `did`.
3. `POST /api/webauthn/login/options` — body `{ did? }`. Returns an
   authentication challenge; when `did` is supplied, `allowCredentials` is
   restricted to that DID's registered passkeys.
4. `POST /api/webauthn/login/verify` — body `{ response }`. Verifies the
   assertion, returns `{ did, token, role: "viewer", ttl }`. The token is a
   short-TTL viewer role token issued via `signRoleToken` (HS256, `sub` = the
   passkey's DID).

### Passkey persistence

Credential storage routes through a `PasskeyStore` interface
(`src/lib/passkeyStore.ts`). The default is a **module-level in-memory `Map`**
(`createMemoryPasskeyStore`), which is per-isolate and intentionally not
durable: passkeys registered by a user are lost on worker redeploy or isolate
eviction. This remains the development/preview path.

When the `AUTH_DB` D1 binding is present (`wrangler.toml`), the worker binds
`createD1PasskeyStore` once per isolate, persisting credentials to the
`passkeys` table (schema in `migrations/0001_auth.sql`):

```sql
CREATE TABLE IF NOT EXISTS passkeys (
  credential_id TEXT PRIMARY KEY,      -- base64url credential ID
  public_key    TEXT NOT NULL,         -- base64url COSE public key
  counter       INTEGER NOT NULL DEFAULT 0,
  did           TEXT NOT NULL,         -- bound did:key
  transports    TEXT NOT NULL DEFAULT '[]',
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_passkeys_did ON passkeys(did);
```

The Map → D1 migration is mechanical: all reads/writes go through the store
(`get` / `listByDid` / `put` / `setCounter`), keeping the
`verifyRegistrationResponse` / `verifyAuthenticationResponse` logic identical.
Challenges remain in the in-memory map (they are short-TTL).

## 3. Cloudflare Access JWT validation

`src/lib/accessJwt.ts` validates the `Cf-Access-Jwt-Assertion` header:

- Parses the JWT, looks up the signing key (`kid`) in the team JWKS fetched from
  `https://<teamDomain>.cloudflareaccess.com/cdn-cgi/access/certs` (cached for
  5 minutes per isolate).
- Verifies the RS256 signature with WebCrypto (`RSASSA-PKCS1-v1_5`).
- Rejects expired tokens (`exp`) and tokens whose `iss` does not reference the
  configured team domain.
- Returns `{ email, sub, country }` or `null`.

The gate is wired into `src/worker.ts` for `ADMIN_ROUTES` and `OPERATOR_ROUTES`.
When `ZERO_TRUST_TEAM_DOMAIN` is set, a valid Access JWT is accepted **in
addition to** the existing role-token check (the role-token path keeps working
unchanged). Grant mapping:

- Valid Access JWT, no email → **viewer** (read access).
- Valid Access JWT with email present → **operator** (covers `OPERATOR_ROUTES`).

Admin write routes (`config`, `entitlement/tier-set`, `love/issue`) require an
admin role token and are **not** granted by an Access JWT alone. If operator
self-service admin is desired, add an email allowlist (e.g. a `ZERO_TRUST_ADMIN_EMAILS`
secret) and map those identities to `admin` — this is intentionally left out to
keep the default posture least-privilege.

### Enabling Cloudflare Access for Workers

1. Dashboard → **Zero Trust** → **Access** → **Applications**.
2. **Add an application** → type **Worker** (or Self-hosted if you use a custom
   domain). The destination is the portal worker, e.g.
   `p31-monetization.trimtab-signal.workers.dev`.
3. Add a policy (e.g. "Allow members of the trimtab team" via identity provider,
   or an email domain) and set a session duration.
4. Repeat or add a second application/policy if you want the admin surfaces
   behind stricter rules (e.g. require an additional authentication method).

Cloudflare then injects `Cf-Access-Jwt-Assertion` on every request to the
protected host; the worker validates it and maps the identity per the table
above. Requesting one of the write routes from a browser that is not
authenticated through Access returns 401/403 from the worker (and, at the edge,
Access itself will challenge the user).

### Setting `ZERO_TRUST_TEAM_DOMAIN`

The team domain is the subdomain of your Cloudflare Access team, used in the
JWKS URL. Set it as a secret (never in `wrangler.toml`):

```bash
wrangler secret put ZERO_TRUST_TEAM_DOMAIN
# input: trimtab
```

### Service tokens for CI/CD

For non-interactive automation (CI pipelines, MCP tools, cron), do not use a
browser. Two options:

- **Role tokens** (existing): `POST /api/auth/token` with `X-Admin-Token:
  <ADMIN_TOKEN>` and a `did`; returns a short-TTL HS256 role token for write
  routes. Prefer this for internal automation.
- **Cloudflare Access service tokens**: Zero Trust → Access → Service Auth →
  create a token, then send `CF-Access-Client-Id` / `CF-Access-Client-Secret`
  headers with the request. The edge issues the JWT the worker validates. Use
  this when the request originates outside your trusted network and you want
  Zero Trust policy to apply.

Never store service-token credentials in source; inject them as CI secrets or
`wrangler secret put`.

## 4. OAuth 2.1 / RFC 8707 role tokens (migration path)

Current role tokens (HS256 JWTs from `src/roles.ts`) carry `sub`, `role`, `iat`,
`exp` and no audience. The `aud` claim per RFC 8707 lets a resource server
confirm a token was minted for *this* origin, preventing token reuse across
hosts. `src/roles.ts` remains intentionally unchanged; the migration is
**implemented behind the `OAUTH21_ENABLED` feature flag** (default off, legacy
path byte-for-byte preserved):

1. **Audience binding (done)** — `src/lib/oauth21.ts` issues tokens with `aud`
   set to the portal origin (`new URL(request.url).origin`) at
   `/api/auth/token` and passkey login, and `verifyRoleTokenOAuth21` enforces
   `aud` (string equality or array membership) in the RBAC gate. When the flag
   is on, the gate verifies audience-bound tokens first and falls back to the
   legacy verifier so pre-existing CI tokens keep working until reissued.
2. **Claims (done)** — the DID stays the `sub`; `viewer` / `operator` / `admin`
   stay a role claim, plus `iat` / `exp` / `jti` per RFC 7519.
3. **D1 session state (done)** — the `AUTH_DB` binding (`wrangler.toml`) backs
   the passkey store (§Passkey persistence) and an issuance audit table
   (`oauth_token_issuances`, `migrations/0001_auth.sql`); every flag-on token
   issuance is recorded by `jti` via `src/lib/oauthSessionStore.ts`.
4. **Provider swap (pending)** — replacing the bespoke HS256
   issuance/verification with `@cloudflare/workers-oauth-provider` (the
   Workers-first OAuth 2.1 provider, full authorization-code flow) is filed in
   `docs/fix-plans/monetization-oauth21-provider-swap.md` and blocked on the
   coordinated dependency-install wave (shared lockfile).
5. Cloudflare Access-issued JWTs route through the same verification boundary
   (`src/lib/accessJwt.ts` stays as the Access-specific validator).

The gate the doc imposed on merging — "a D1 binding exists … and the passkey
store has moved to D1" — is now satisfied; the flag is the remaining rollout
lever. Flip it by setting `OAUTH21_ENABLED = "true"` in `wrangler.toml`
`[vars]` (or `wrangler secret put OAUTH21_ENABLED`, input: `true`).

## 5. Testing checklist

- `pnpm typecheck` — passes.
- `pnpm lint` — 0 errors.
- `pnpm test` — 20/20 (6 smoke + 14 auth-layer tests: `oauth21.test.ts`,
  `passkeyStore.test.ts`).
- `pnpm build` — production bundle builds.

Manual validation after deploy (not part of the gates):

- Register a passkey from the frontend (once the frontend is wired), then log in
  and confirm the viewer token is returned.
- Protect the worker behind a Cloudflare Access application, set
  `ZERO_TRUST_TEAM_DOMAIN`, and confirm a browser request to
  `/api/btcpay/sweep` succeeds with only the Access JWT, while `/api/love/issue`
  still requires an admin role token.