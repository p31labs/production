# fix: reference OAuth validator lacks `iss` validation (issuer mix-up gap)

<!-- P31-HEADER
id: p31_fix_plan_mcp_servers_oauth21_iss_cimd_20261011_v1.0
type: fix-plan
component: workers
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`workers/p31-capital-machine-mcp/src/index.ts` is the fleet's RFC 8707
reference implementation, but its `verifyOAuthBearer` (lines 412–449) checks
alg, kid, signature, `exp`, and `aud` — and **not `iss`**. A token minted by
any other authorization server that shares the configured JWKS/aud would pass
the gate. RFC 9207 (OAuth 2.0 Authorization Server Issuer Identification)
exists precisely to prevent this mix-up / issuer-substitution attack.

## Evidence

- `workers/p31-capital-machine-mcp/src/index.ts:412-449` — no `iss` check in
  `verifyOAuthBearer`; the `issuerFromJwks` helper (`:451-458`) exists but is
  only used for metadata emission.
- `docs/enterprise/api/oauth-21-rollout-runbook.md` §1 gap 1 — documents the
  gap and the fix to apply in the coordinated wave.
- Preprint context: arXiv:2605.22333v1 (2026-05-21) — delegated-authorization
  flaws (the category issuer substitution falls under) affected 15.1% of the
  119 tested servers.

## Plan (owned by the parallel MCP wave agent; runbook §2 Step 4)

1. In `verifyOAuthBearer`, after the `aud` check: require
   `typeof payload.iss === 'string'` and
   `payload.iss === issuerFromJwks(env.OAUTH_JWKS_URL)`; return null otherwise.
2. Apply the same `iss` check in every server's ported validator (runbook
   Steps 3–4) rather than copying the reference's gap.
3. Optional hardening: resolve the issuer from the RFC 8414 AS metadata
   (`/.well-known/oauth-authorization-server` of the configured AS) instead of
   inferring from the JWKS URL.
4. After the wave, update this plan → done and remove gap 1 from the runbook.

## Not in scope

- oauth-relay (AS side) already emits `iss` on authorization responses and
  token responses (`workers/oauth-relay/src/index.ts:580,645`).
- CIMD enforcement on the AS side (`resolveClientMetadata`,
  `workers/oauth-relay/src/index.ts:139-163`) is implemented behind
  `CIMD_ENABLED`; flipping the flag is a rollout step, not a code fix.

## Resolution (2026-10-12, deploy wave)

- `workers/p31-capital-machine-mcp/src/index.ts:542-548` — after the RFC 8707
  `aud` check, `verifyOAuthBearer` now requires `typeof payload.iss ===
  'string'` and equality with the expected issuer: `env.OAUTH_ISSUER` when
  set, else the origin derived from `OAUTH_JWKS_URL` via `issuerFromJwks`
  (`:557-563`). Mismatch ⇒ null (401 at the gate). Doc comment updated
  (`:500-507`).
- `Env` interface gains optional `OAUTH_ISSUER` (`src/index.ts:71-77`);
  `wrangler.toml` documents the var (commented, fallback is automatic).
- Pre-checks green: `npx tsc --noEmit` exit 0; `wrangler deploy --dry-run`
  clean.
- Deployed: version `6204975f-a75e-4bf7-9c10-539f08eaa071` (2026-10-12).
  Live probes: `GET /health` 200; `POST /mcp` initialize + tools/list OK.
- Runbook gap 1 (`docs/enterprise/api/oauth-21-rollout-runbook.md`) updated to
  closed; Step 4 of §2 remains the pattern for the other servers' ported
  validators.

## Fleet wave evidence (2026-10-12 — 7 resource servers)

Every ported validator includes the `iss` check (Step 4) — none copies the
reference's pre-fix gap. Per-server RFC 8707 gate, `iss` line, version, and
verification:

| Server | verifyOAuthBearer / gate | Deployed version | Live evidence |
|---|---|---|---|
| bros | `src/index.ts:197` / `:630` | `867c32f5-633c-47bb-8f63-cb3bc38a06a0` | 8414/9728 200 + correct JSON; garbage bearer on tools/call ⇒ 401; no-token ⇒ 200 |
| dads | `src/index.ts:246` / `:683` | `baa89107-7372-461c-8332-a505a4209e54` | same |
| p31-justice-hub | `src/index.ts:157` / `:659` | `207a7800-8574-48c5-9c7a-020970ad9e9c` | same |
| p31-crypto-mcp | `src/index.ts:148` / `:368` | `5080b1ec-c0f2-469a-8808-476d906a1f58` | same |
| phenix-wallet-mcp | `src/index.ts:141` / `:730` | `47a7bb5d-9e2d-4271-9346-115ba7e24c55` | same (`Env` + `[vars]` newly added) |
| mcp-registry | `src/index.ts:664` / `:2133-2147` (`handleMcpSurface`) | `93cf31bf-7dc1-45aa-9340-38bdc04af5f1` | same + 75/75 vitest; x-mcp-header forwarding `:1798-1802`; server-card `oauth` block |
| mcp-x402-gateway | `src/index.ts:139` / `:601-609` | **source-only** — deploy blocked (`p31-fix-plan-gateway-deploy-secrets-store-scope.md`) | `tsc --noEmit` + `--dry-run` green; no live probe possible |

All 7 use env opt-in exactly as the reference: `OAUTH_JWKS_URL` +
`RESOURCE_ID` shipped as plain `[vars]` (fallback resource constant in code),
`OAUTH_ISSUER` optional (derived from the JWKS origin when unset). With no
`Authorization` header, behavior is unchanged (open discovery preserved —
runbook §6 do-nots); a supplied Bearer MUST validate or the call is 401'd,
never silently ignored. CIMD over DCR: no server has a DCR endpoint (nothing
to deprecate); each RFC 9728 document advertises
`authorization_servers: ["https://oauth-relay.trimtab-signal.workers.dev"]`
so clients do CIMD-based discovery against the AS. Fleet health after the
wave: `node scripts/mcp-health-check.mjs` → 16/16 pass.