<!-- P31-HEADER
id: p31_access_middleware_prep_20261014_v1.0
type: runbook
component: enterprise-operations
status: live
retention: keep-forever
created: 2026-10-14T00:00:00Z
owner: will
-->

# Cloudflare Access Pages Plugin — Middleware Prep

**Prepared for owner activation. Last reviewed: 2026-10-14.** The
governed Pages surfaces get Cloudflare Access in front of them via the
Pages plugin `@cloudflare/pages-plugin-cloudflare-access`. This doc holds
the scaffold, the env contract, the governed-surface inventory, and the
owner activation steps. Nothing here is activated yet — the middleware
passes through until the owner turns Access on in the dashboard.

## Env contract

| Env var | Value | Where it comes from |
|---|---|---|
| `CF_ACCESS_TEAM_NAME` | the Access **team domain** (e.g. `p31`) → plugin `domain: https://<team>.cloudflareaccess.com` | Zero Trust → Settings → Custom Pages (team domain) |
| `CF_ACCESS_APP_AUD` | the **application audience tag** (`aud`) of the Access application protecting this surface | Zero Trust → Access → Applications → *the app* → Overview |

Both are configuration values, **not secrets** — they appear in browser
redirects and JWTs. They still live in Pages **environment variables**
(per-surface), never hardcoded, so the same `_middleware.ts` serves every
surface. The Access **service token** is a real secret and is deliberately
out of scope: the Pages plugin does not need one.

## The scaffold (follows the repo's Pages Functions pattern)

The repo already carries the honest pass-through pattern at
`portals/workspace/functions/_middleware.ts:16-28` (401 when the JWT is
absent, `next()` when Access is not configured). The activation form is
the same file shape, with the plugin:

```ts
// functions/_middleware.ts — Cloudflare Access gate for a governed surface.
import cloudflareAccessPlugin from '@cloudflare/pages-plugin-cloudflare-access'

interface Env {
  CF_ACCESS_TEAM_NAME?: string
  CF_ACCESS_APP_AUD?: string
}

// Plugin config is static per deploy; read team + aud from the Pages
// environment variables set in the dashboard, and stay pass-through
// (honest posture) until the owner has activated Access for the surface.
export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, next } = context
  if (!env.CF_ACCESS_TEAM_NAME || !env.CF_ACCESS_APP_AUD) {
    return next() // Access not activated yet — deliberate pass-through.
  }
  return cloudflareAccessPlugin({
    domain: `https://${env.CF_ACCESS_TEAM_NAME}.cloudflareaccess.com`,
    aud: env.CF_ACCESS_APP_AUD,
  })(context)
}
```

Notes:

- The plugin itself is the canonical form:
  `export const onRequest = cloudflareAccessPlugin({ domain, aud })`.
  The wrapper above exists only so activation is a **dashboard** change
  (set the two env vars) with no code edit or redeploy of the gate.
- A missing `Cf-Access-Jwt-Assertion` header returns 401 with the
  Access redirect flow; a valid JWT whose `aud` claim matches passes.
- The plugin must be added to the surface's `package.json`
  (`@cloudflare/pages-plugin-cloudflare-access`), same as any Pages
  dependency. No version is pinned here — owner picks current at
  activation.

## Existing middleware inventory (read-only)

| Surface | Middleware | Posture today |
|---|---|---|
| `portals/workspace/functions/_middleware.ts` | Access placeholder (`CF_ACCESS_TEAM_DOMAIN`/`CF_ACCESS_AUD`) | pass-through until Access activated |
| `portals/ui-forge-studio/functions/_middleware.ts` | session-cookie auth (`p31_session`) | already session-gated |
| `portals/shell/functions/`, `portals/qpj/functions/` | no auth middleware found | governed-candidate |
| `apps/loom/functions/_middleware.ts` | per-request CSP nonce | security headers only |
| `apps/loom/verify-public/functions/_middleware.ts` | CORS only | **deliberately public** — never Access-gated |
| `apps/bonding/functions/`, `apps/arcade/functions/` | no auth middleware found | governed-candidate |

## Governed surfaces (proposed activation order)

1. `portals/workspace` (already has the placeholder — first to activate).
2. `portals/ui-forge-studio` (Access in front of the existing session
   cookie — defense in depth).
3. `portals/shell` and `portals/qpj` (adopt the scaffold).
4. `apps/loom` (keep `verify-public` permanently public).

## Owner activation checklist (dashboard)

1. **Zero Trust → Access → Applications → Add** → Self-hosted → name +
   subdomain for each governed surface; policy = allowed identity
   providers (email/IdP).
2. Copy the application's **AUD** from the app Overview → set
   `CF_ACCESS_APP_AUD` in the Pages project → Settings → Environment
   variables (production).
3. Set `CF_ACCESS_TEAM_NAME` to the team domain label (the subdomain
   prefix of `<team>.cloudflareaccess.com`).
4. Deploy the surface once (middleware + plugin dependency).
5. Verify: unauthenticated browser → Access login redirect; after login →
   surface loads. Negative control: `curl -I <surface>/api/...` without
   the `Cf-Access-Jwt-Assertion` header → 401.
6. Record activation in the operations log and tick the item in
   `docs/fix-plans/p31ca-secrets-automation-2026-10-14.md`.

The env names here (`CF_ACCESS_TEAM_NAME`, `CF_ACCESS_APP_AUD`) are the
estate-wide contract; the existing workspace placeholder uses
`CF_ACCESS_TEAM_DOMAIN`/`CF_ACCESS_AUD` — align that surface to the
estate names at activation time (its `_middleware.ts` wrapper swaps the
two names, no other change).