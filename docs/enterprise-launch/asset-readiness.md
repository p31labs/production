# Enterprise Asset Readiness Matrix

**Date**: 2026-09-22. All URLs re-tested live; npm and IETF status re-verified today. Traffic lights: ✅ ship-ready · ⚠️ needs work before use · ❌ do not ship.

## Enterprise-core assets

### Loom — the governance chain ✅ (positioning) / ⚠️ (demo)
- What: hash-chained append-only agent/human event log, pre-execution policy gate, refusal sidecar, independent `/verify`.
- Live: `loom.p31ca.org` (302 → Cloudflare Access when unauthenticated — gated, correct for production).
- Bindings: D1 (`LOOM_D1`), Durable Objects (SSE broadcast + LumiSession PIP), R2 (backups), Cloudflare Access. (`apps/loom/wrangler.toml`)
- Ready for enterprise: architecture yes. **Gap: no public, inspectable demo** (an engineer at a target company can't verify the chain today). See launch-plan item "public demo endpoint".
- Env today: `LUMI_ENFORCEMENT = "observe"` — enforcement warm-up mode, not yet `enforce`. (correct staged rollout; do not claim enforce)

### Lumi — agent identity / capability tokens ⚠️ (publish first)
- What: PQC capability tokens (AIC-JWT format), composite Ed25519 + ML-DSA-65, 15-min expiry, fail-closed verifier. `software/packages/agent-engine/src/lumi-identity.ts`.
- **Blocker**: published `@p31ca/agent-engine@0.1.0-alpha.0` tarball does **not** include `lumi-identity.js` — the entire governance story is missing from the package people can `npm install`.
- `@p31ca/sovereign-primitives` (the crypto: composite ML-DSA-65 signatures) is **not published** (`private: true`).
- Action: republish `agent-engine` with `lumi-identity`; publish `sovereign-primitives` (flip `private`). See `launch-plan.md`.

### Relay — y-websocket + PQC tokens ✅ (proof asset)
- Live: `p31-doc-relay.trimtab-signal.workers.dev` — returns 200, `text/plain;charset=UTF-8`, "p31-doc-relay — yjs websocket relay".
- What it proves: Yjs/CRDT collab on Workers + PQC tokens in the auth path — the rarest combo in the portfolio.
- Ready for enterprise: yes, as a proof and as a sellable integration target.

### `@p31ca/cli` ✅
- Published `3.0.0` (MIT, bin `p31`, MCP `com.p31ca/oasis-mcp`). Docs: README, AGENTS.md, `llms.txt`, install script `curl -fsSL https://cli.p31ca.org/install | bash` (live).
- Enterprise-ready: yes for developer tooling. No built-in OAuth (env-API-key config) — fine for a CLI, note it.

### phos — sovereign PWA ⚠️ (components only)
- Live: `phos.p31ca.org` (200), `/health` 200. Astro 5 + React 19 + PGlite + Yjs; `@noble/post-quantum` (ML-DSA-65 / ML-KEM, FIPS 204/203).
- **Enterprise use**: extract/position the PQC + local-first components. **Exclude the 35 family-facing surfaces** from enterprise materials.

## Marketing / trust surfaces ✅

- `p31ca.org` — Astro static hub (live). Pages: index/about/arcade/blog/donate/get-involved/research/signin/signup/treasury.
- `phosphorus31.org` — nonprofit institutional site (live, FRUIT stage).
- Both: add Nonprofit Organization schema (JSON-LD `@type: NGO`), live chain-verification widget, simplified donation form. (See `docs/PRODUCTION-READINESS.md`.)

## Package publishing status (verified on npm registry today)

| Package | npm | Verdict |
|---|---|---|
| `@p31ca/cli` | 3.0.0 ✅ | publishable |
| `@p31ca/vibe-sdk` | 1.0.0 ✅ | ok |
| `@p31ca/design-core` | 2.1.0 ✅ | ok |
| `@p31ca/cognitive-passport-schema` | 1.1.0 ✅ | ok |
| `@p31ca/forge-sdk` | 1.0.0 ✅ | ok |
| `@p31ca/mcp-justice` | 1.0.0 ✅ | ok |
| `@p31ca/mcp-vibe` | 1.0.0 ✅ | ok |
| `@p31ca/ui` | 1.3.0 ✅ | ok |
| `@p31ca/game-engine` | 0.1.0-alpha.0 ✅ | ok |
| `@p31ca/agent-engine` | 0.1.0-alpha.0 ⚠️ | **stale — missing lumi-identity** |
| `@p31ca/canon` | **404 ❌** | **publish (workflow exists: `publish-canon.yml`)** |
| `@p31ca/sovereign-primitives` | **404 ❌** | **publish (flip `private: true`)** |
| `@p31ca/relay`, `@p31ca/portal` | 404 | no source dir — drop from claims |
| `andromeda-cli` | 1.1.3 ✅ | ok |

## Do-not-ship (protect the portfolio)

- **7 portals** (qpj/design/chat/meatspace/willow/tetra/sixseven): COPPA-sensitive family surfaces. Never in enterprise materials.
- **Spaceship Earth**: live (`spaceship-earth.pages.dev`). **UNFROZEN 2026-09-23** for enterprise production launch (governance decision supersedes the MASTER_PLAN GREEN-tier freeze). Status: ✅ ship. WebGPU + neurodivergent-UX upgrade in progress; hero page live at `/apps/spaceship-earth`.
- **LUMI_REQUIRE_TOKEN / `enforce` state**: not yet enabled in production — do not claim enforcement is on; it is staged (`observe`).

## Summary of blockers to close before outreach

1. Publish `@p31ca/canon` (workflow ready). → 1h
2. Publish `@p31ca/sovereign-primitives` (flip private, build, publish). → 2h
3. Republish `@p31ca/agent-engine` with `lumi-identity.js`. → 4h
4. Public Loom demo endpoint (domain-gated or read-only synthetic). → 1 day
5. Fix stale docs (done: PROOF-OF-BEHAVIOR, POSITIONING, README, GRANT-PIPELINE, MEATSPACE-RUNBOOK, master prompts).