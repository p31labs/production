# GOVERNANCE — what Lumi may do, where it is enforced, where refusals land

One page. The contract the NIST AI Agent Standards posture and DIF's agent
interoperability both converge on: a capability token **authenticates**; a
session policy **authorizes**; governance that isn't in the audit log doesn't
exist.

## 1. The declaration (single source)

- **One shape, one file**: `AgentScopeDeclaration` in
  `packages/canon/src/loom/scope.ts`. `@p31ca/agent-engine` re-exports it as
  `LumiScopeDeclaration` — the identity layer and the enforcement layer cannot
  drift.
- **The invariant**: `coPresenceOnly: true` — Lumi proposes, the human decides.
  `humanApprovedKinds` (`approve|reject|focus|revise`) are kinds Lumi may
  NEVER emit.

## 2. Identity vs session state (NIST split)

The Lumi identity model aligns with the 2026 agent-identity drafts — **AIC-JWT**
(AI Agent Identity Certificate JWT, draft-wei-aic-jwt) and **AIP** (Agent
Identity Protocol, Invocation-Bound Capability Tokens, draft-prakash-aip):
transport auth, application identity, and domain authorization are three
distinct layers, each with a named referent.

| What | Where it lives | Referent |
|---|---|---|
| Transport auth | Cloudflare Access service token (`CF-Access-Client-Id/-Secret` on Lumi's writes) | AIC-JWT transport binding |
| Application identity | The PQC capability token (`@p31ca/sovereign-primitives`, minted by `@p31ca/agent-engine`) — `iss` = Lumi's `did:key`, `caps` = attenuated authorization | AIP IBCT (compact JWT mode) |
| Domain authorization | The writer-per-kind gate + `LUMI_ENFORCEMENT` scope/session checks | AIP delegation semantics |

`ScopeGuard` refuses any action whose kind is **not in the token's caps** —
the token, not a parallel declaration, drives what Lumi may emit
(`makeLumiTokenVerifier` in `@p31ca/agent-engine`). The Loom write path enforces
the same caps check when `LUMI_REQUIRE_TOKEN` is on (not yet set — transport
auth is the boundary today; `LUMI_REQUIRE_TOKEN=true` ships with the enforce
rollout). Roadmap: when AIP's Biscuit-chained mode is production-ready, the
capability token could carry the delegation chain (who authorized this
proposal, through which hops).

**KNOWN alias quirk**: on Access-edge-protected hostnames (`loom-8z0.pages.dev`
alias, `loom.p31ca.org` custom domain) Cloudflare's Pages-Access integration
handles service-token auth and strips the `CF-Access-Client-*` headers before
the handler — service-token writes commit but the `subject` attribution is empty
there. Deployment/preview URLs attribute correctly
(`subject: service:<client_id>`). The custom domain (`loom.p31ca.org`,
2026-09-22) is the primary surface: SPA 200, API Access-gated (302 no-creds /
wrong-creds), service-token writes commit. Browser (human) login works on the
custom domain — the AUD is shared with the pages.dev app (`632d76e1…`), so the
middleware's aud check passes.

## 2b. Human access — Cloudflare Access (ENFORCED 2026-09-22)

The Loom is behind Cloudflare Access. The app was created via a scoped
`Access: Apps and Policies Write` token (minted with a `Create Additional
Tokens` bootstrap token; the wrangler token is read-only for Access):

- **Access app** `Loom` (self-hosted, domain `loom-8z0.pages.dev`,
  `preview_urls_enabled = true`), **AUD `632d76e19a37300f679ccf97a8ca366baf3f324868ad2e5b23118b8ae40c1ffa`**
  (in `wrangler.toml [vars]`).
- **Policies**: `Allow family` (`everyone` — any user who can authenticate via a
  configured IdP; correct for a family-owned account) and `Lumi writes events`
  (service-token-only; the include array is an OR, so no `everyone` clause).
  **Lesson (found the hard way)**: policies MUST be created under
  `/access/apps/{app_id}/policies` — the top-level `/access/policies` endpoint
  creates ORPHAN policies (`app_id` empty) and the app then has NO allow policy
  (locks everyone out). Both were orphaned initially and recreated attached.
- **Lumi service token** `lumi-write-2`:
  `client_id 59a1cac566edc31619828e2da39256d3.access` /
  `client_secret cfast_HJzX…` — stored as Pages secrets `CF_ACCESS_CLIENT_ID` /
  `CF_ACCESS_CLIENT_SECRET`.
  ✅ **SECURITY INCIDENT CLOSED (2026-09-23):** the token was exposed in a
  plaintext transcript (`downloads/Executing the review s fixes…txt`). The
  secret was **rotated via the API** on 2026-09-23: `POST …/access/service_tokens/
  bb17c313…/rotate` → `client_secret_version` 1→2, `client_secret` now
  `cfast_HJzX…` (exact value in Pages secrets, not in repo). The exposed secret
  (`cfast_bol8…`) is **rejected** (verified `HTTP 302` 2026-09-23); the new
  secret returns `valid:true` on `/api/loom/verify`. Pages secret
  `CF_ACCESS_CLIENT_SECRET` updated and the project redeployed 2026-09-23.
  Full procedure + post-rotation checks: `apps/loom/docs/TOKEN-ROTATION.md`.
- **Service-token auth is WIRED** into `_lib/access.ts`: `accessGate` accepts a
  request whose `CF-Access-Client-Id`/`CF-Access-Client-Secret` match the stored
  Pages secrets (Access validated the token at the edge; the header check is
  belt-and-suspenders against a path-bypass spoof) and binds
  `sub = service:<client_id>`. Verified live: a service-token write committed
  as `seq 4` with `subject: service:59a1…`.
  **KNOWN LIMITATION**: Cloudflare Access honors the service token on
  deployment/preview URLs (`<hash>.pages.dev`) but NOT on the production alias
  (`loom-8z0.pages.dev` — the meta reports `service_token_status: false` and
  redirects to login). Humans still work on the alias via interactive login.
  The fix is a **custom domain** (`loom.p31ca.org`): Access on a custom domain
  evaluates service tokens consistently. Until then, Lumi's server-side writes
  should target a deployment URL, or use the browser-mediated path.
- **Verified fail-closed**: unauthenticated `loom-8z0.pages.dev/api/loom/*`
  → 302 (Access login redirect); preview URLs → 401; service-token write on a
  deployment URL → commits; mismatched service creds → 302/401.
- **Preview/old-deployment purge**: every previous production deployment's
  `<hash>.loom-8z0.pages.dev` URL served the API unauthenticated (the
  `preview_urls_enabled` toggle gates preview deployments, not old production
  hash URLs). All superseded deployments were deleted → 404/401. **Run
  `scripts/purge-superseded-deployments.sh loom` after every deploy** (it
  keeps only the canonical deployment).
- Setup tokens: `loom-access-edit2` and `loom-access-edit3` (short-lived Access
  write tokens) were deleted after use; re-mint on demand via the
  `Create Additional Tokens` bootstrap token.

## 3. Where enforcement runs

1. **The Loom write path** (`apps/loom/…/event.ts` → `guardAgentEvent` in
   `_lib/log.ts`): every agent-originated event is checked before the gate
   commits it. **One severity knob**, the enterprise state-machine pattern
   (OPA/Kyverno/Cedar):
   - `LUMI_ENFORCEMENT = 'off'` → no scope/session checks (default).
   - `LUMI_ENFORCEMENT = 'observe'` → scope + session checks run; a violation
     is recorded as an **observation** (`mode='observe'`) and the event is
     ALLOWED — the safe warm-up for a gate on existing traffic.
   - `LUMI_ENFORCEMENT = 'enforce'` → a violation is a **refusal**
     (`mode='enforce'`) and the event is blocked.
   - `LUMI_REQUIRE_TOKEN = 'true'` → a self-contained PQC capability token
     (aud `p31-loom`, `X-Lumi-Token` header) is required and its `caps` claims
     must cover the action kind. **Routed through `LUMI_ENFORCEMENT` like every
     other gate** — observe records "would refuse: no token" and allows;
     enforce refuses. Never flip to `enforce` without an observe warm-up on
     traffic that isn't yet sending tokens.

   Checks, per kind: propose/presence check their `node`; traverse checks both
   `from` and `to`; review — a reaction to an already-vetted proposal — checks
   kind conformance only.
2. **The gateway library** (`packages/canon/src/loom/gateway.ts` →
   `dispatchAgentAction`): the reusable propose-or-refusal dispatcher any other
   Lumi call site uses.
3. **The session cap (PIP)** — `maxProposalsPerSession`, one Durable Object
   **per session** (`idFromName(room)`), an **atomic SQL counter** (one row per
   day, `INSERT … ON CONFLICT … RETURNING count`). Enforce mode increments and
   refuses when over the cap; observe mode **peeks** (`?peek=1`, no increment)
   so observations don't burn the cap. Without a token the session falls back
   to `anonymous` (a global per-day cap) — pair `LUMI_REQUIRE_TOKEN` with the
   session cap for per-session granularity.
   - **Reachability**: Pages Functions have NO `LOOM_SSE` service binding
     (Pages ignores `services` in `wrangler.toml`; confirmed —
     `production.services: undefined`). The guard uses the **`LOOM_SSE_URL` +
     `LOOM_INTERNAL_SECRET` fallback** (the `/stream` path) — that is the
     active path; the `env.LOOM_SSE` branch is retained for a future Workers
     host. See `docs/LOOM-WORKERS-MIGRATION.md`.
   - **Unreachable = auditable + fail-open on the cap** (deliberate): identity
     checks (the token gate) fail CLOSED; cap/quota checks fail OPEN with an
     observation (`session PIP unreachable — cap not enforced`) so a transient
     PIP blip doesn't refuse every agent proposal (a self-inflicted outage), and
     the sidecar records the degradation for the operator. The token gate
     remains the security boundary.

**The transition runbook (SRE canary, from the review's protocol):** start in
`observe`; run `scripts/lumi-enforcement-suggest.mjs` against
`GET /api/loom/refusals` (with `--total <agentEvents>` and
`--baseline-start-ts <ISO>` to exclude pre-window test data). Promote to
`enforce` only when the script says PROMOTE: observe ≥ 72h, would-refuse rate
< 2%, no observation with an unknown reason. Roll back to `observe`
automatically when the enforced-refusal rate spikes > 3x the observe baseline.
Never jump straight to `enforce` on traffic that has never been observed.

**The rollout sequence (corrected):** observe scope → observe token
(`LUMI_REQUIRE_TOKEN=true` under observe — records the would-refuse rate of
token-less traffic) → mint PQC tokens for Lumi → enforce scope → enforce token
→ **then** enforce session (`LUMI_ENFORCEMENT` covers the session cap). Session
enforcement requires tokens first: without `LUMI_REQUIRE_TOKEN=true` the
session falls back to `anonymous` — a global per-day cap, not per-session.

## 4. Where refusals land

A refusal is **auditable or it doesn't exist**. Both refusals and observations
land in the **sidecar log** — a `refusals` D1 table, hash-chained with the
**same JCS canonicalizer as the events log** (`refusalToChainRecord` →
`@p31ca/canon`'s `hashRecord`), so the two chains are verifiable by the same
code. `mode` separates enforced refusals from observations. `event.ts` records
before acting; `GET /api/loom/refusals` lists them (with counts per mode) and
`GET /api/loom/refusals/verify` walks the chain and names any break. When the
frozen-interface owner approves the envelope extension (see
`packages/canon/docs/REFUSE-KIND-EXTENSION.md`), refusals become first-class
Loom events and the sidecar rows upcast into the main log.

## 5. Evaluation gates the release, not the family

- **Per-PR (deterministic, <30s)**: `scripts/lumi-eval.mjs` — five dimensions
  (planning, safety, coPresence, memory, structure) + per-session co-presence
  trend. Wired in `.github/workflows/lumi-eval.yml`.
- **Nightly/release (Tier 2)**: the LLM-judge rubric (`--judge`, 3 binary
  criteria per proposal) — reserved for a scheduled workflow, cost-capped.
- **Training**: never fine-tune below the research threshold
  (`--recommend` in `export-training-data.mjs`); family logs under ~200
  decided proposals are served by retrieval (`lumi-prompt.mjs`).

## 6. Observation window — in progress

- **Baseline** (observation window restarts here, excluding deploy-test data):
  `2026-09-22T18:49:47Z` (the compensating `view.save` `deploy-smoke-test-2026-09-22`).
- Run `scripts/lumi-enforcement-suggest.mjs` with
  `--baseline-start-ts 2026-09-22T18:49:47Z --total <agentEvents-since-baseline>`.
- **Promote to `enforce` only when**: observe ≥ 72h, aggregate would-refuse rate
  < 2%, no unknown reasons, **and ≥ `--min-events` (default 20) agent events
  since baseline** — an empty window is NOT a clean window. Until real Lumi
  traffic flows, the window is **dormant, not clean**: the +72h reminder means
  "not started", and promoting on an empty window is a one-way door. Re-check
  weekly until events ≥ min.
- **After promoting, the first 24h is a mini-canary**: a spike in enforced
  refusals > 3× the observe baseline means roll back to `observe`. The
  **`loom-enforcement-guard`** Worker (`*/15 * * * *`) reads the refusals
  sidecar and appends an `auto-rollback-alert` `view.save` event on a spike
  (`isEnforceSpike`: ≥ 4 refusals in 15m AND > 3× the per-window observe
  baseline) — the operator sees it in the chain. The auto-FLIP
  (`LUMI_ENFORCEMENT=observe` via the Pages env_vars PATCH) is the documented
  follow-up: the PATCH must preserve the redacted secrets. A canary without
  auto-reversal is theater.
- **Reminder**: re-run at +72h (2026-09-25T18:49Z) and +7d (2026-09-29T18:49Z).
- **Lumi traffic**: once real agent events flow, they should carry
  `statedBy: 'lumi'` (or a token `iss`) so the observation rate is meaningful.
- **Concierge Session 1 (2026-09-23 01:11Z) — internal operator pilot.**
  ⚠️ Corrected 2026-09-23: this was an **operator pilot**, not family traffic.
  It produced two real events in the window — `propose` `concierge-1790125867815`
  (seq 14, `via: 'concierge'`, node `.street`) and the human `approve` (seq 15)
  — but the participant was the operator, consent was NOT signed, and the
  session must not be counted as family validation. For observation-window
  purposes it is 1 agent event in-window (a smoke test, not real Lumi traffic);
  `lumi-enforcement-suggest.mjs` (baseline `2026-09-22T18:49:47Z`, `--total 1`)
  → **KEEP OBSERVING** (window 6.4h < 72h, 1 agent event < 20). The window
  remains **dormant** until a real family member runs a session. Full record:
  `docs/concierge-session-1.md`. **Security:** the service-token creds used to
  write seq 14–15 were recovered from a plaintext transcript; **rotate the
  token** (dashboard → Access → Service Auth).

## 7. The one sentence

Lumi holds a capability token that proves who it is and what it may emit; the
Loom's write path enforces it at action time (severity-graded, rollout-safe);
anything refused or observed lands in a JCS-verifiable sidecar; the events and
refusals chains are backed up and restore-drilled.

## 8. Backup & restore runbook (drilled 2026-09-22)

An audit chain without a tested restore is a paper chain.
```bash
# Backup (weekly / before any enforce transition):
cd apps/loom
npx wrangler d1 export LOOM_D1 --remote --output=/tmp/loom-$(date +%F).sql

# Restore drill:
npx wrangler d1 create loom-scratch-verify           # note the database_id
npx wrangler d1 execute <scratch-id> --remote --file=/tmp/loom-<date>.sql
# Confirm parity: same events + refusals row counts, and the last events
# prev_hash matches the live chain's expected link.
npx wrangler d1 delete <scratch-id> --force
```
The 2026-09-22 drill restored 3 events + 1 refusal with the correct last
`prev_hash` — the chain round-trips. Cold storage (R2 export) is the
documented next hardening step.