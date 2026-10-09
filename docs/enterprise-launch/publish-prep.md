# Package Publish Prep — verified state (2026-09-23)

> **Gate**: publishing is a public release. **Human approval required before `npm publish`.** Nothing below has been published this session.

## Status: BLOCKED on npm credential (2026-09-23)

The three packages are **publish-ready and tarball-verified**, but **npm publish
cannot run**: the local token (`~/.npmrc` `npm_SlKE…`) and `$NPM_TOKEN` both
return **401 Unauthorized**; the repo is **private** (so npm OIDC trusted
publishing cannot bootstrap a first publish); and the packages do not yet exist
on npm (no trusted-publisher registration). Per human decision 2026-09-23,
**publish is held** until a valid token is provided.

## Verified blockers (npm registry, checked today)

| Package | npm status | What's needed | State |
|---|---|---|---|
| `@p31ca/canon` | **404 (not published)** | Valid npm token → `npm publish --provenance --access public` (or trigger `.github/workflows/publish-canon.yml` once trusted publishing is registered). Package: `private: false`, `publishConfig.access: public`, provenance on. Ships `src` (TS-first) + tokens + CSS + contracts. Pack: 108kB / 73 files. | ✅ publish-ready, awaiting token |
| `@p31ca/sovereign-primitives` | **404 (not published)** | Valid npm token → `npm publish --access public` (from `packages/sovereign-primitives`). `private: false`, dist build clean (tsc), LICENSE added 2026-09-23, no tests leak. Pack: 30.2kB / 30 files. | ✅ publish-ready, awaiting token |
| `@p31ca/governance` | **404 (not published)** | **NEW package 2026-09-23.** Facade over `@p31ca/design-core/governance` (7 governance components) + tokens. Valid npm token → `npm publish --access public`. Ships `src` + README + LICENSE. Pack: 3.0kB / 12 files. **Requires design-core ≥2.2.0 republish first** (published 2.1.0 lacks `./governance`). | ✅ publish-ready (blocked on design-core republish + token) |
| `@p31ca/design-core` | published `2.1.0` but **stale** | **Republish as 2.2.0** with `./governance` export + M3 Expressive springs (both present in workspace, absent from published 2.1.0). Valid npm token → bump version, `npm publish --access public`. | ⚠️ must republish before governance |
| `@p31ca/agent-engine` | published `0.1.0-alpha.0` but **stale** (tarball lacks `lumi-identity.js`) | Republish with `lumi-identity` in dist. **Blocked**: build fails on `@p31ca/canon/loom/scope` because canon's published form is raw `.ts` with `.ts`-extension imports (`gate.ts(21,55): TS5097`) | ⚠️ **blocked — needs canon compiled dist first** |

## The dependency chain (honest)

`agent-engine` imports `@p31ca/canon/loom/scope` + `@p31ca/sovereign-primitives` (both `workspace:*`).

- `@p31ca/sovereign-primitives` → ✅ publishable now (done, builds to `dist` JS with extensionless `.js` paths).
- `@p31ca/canon` → publishes `./src/*.ts` via its `exports` map; its own source uses `import './x.ts'` (TS-extension imports). Consumers using plain `tsc` (like agent-engine) fail with TS5097 unless `allowImportingTsExtensions` is set or canon ships compiled JS.
  - **Two options** (human decides):
    1. **Publish canon as source** (it's already configured that way) and add `allowImportingTsExtensions` to agent-engine's tsconfig (moduleResolution bundler) — smallest change, acceptable for TS-first consumers, unusual for a library on the public registry.
    2. **Add a compiled dist to canon** (tsconfig `noEmit` → emit, fix `.ts` imports to `.js`) — the proper enterprise-grade path, ~half-day, touches 43 exports.
- Publishing order if done: `@p31ca/canon` first (or sovereign-primitives, then canon, then agent-engine). `workspace:*` must resolve to the registry version at publish time.

## Exact commands (for the human, after a valid npm token is available)

> The gh token in `~/.config/gh/hosts.yml` is valid (repo access confirmed
> 2026-09-23) but the **GH_TOKEN env var is invalid** and overrides it. Run
> `unset GH_TOKEN` before using `gh` if you go the Actions route. The npm
> tokens (`~/.npmrc` `npm_SlKE…` and `$NPM_TOKEN`) are **401** — replace with a
> token that has publish scope for the `@p31` scope (`npm login` or
> `npm token create --publish`).

```bash
# publish order: dependency-first, with design-core republish
# 1. sovereign-primitives (ready; no deps)
cd packages/sovereign-primitives
npm publish --access public

# 2. canon (ships src/tokens/css/contracts; no external deps)
cd packages/canon
npm publish --provenance --access public

# 3. design-core — ⚠️ REPUBLISH REQUIRED (2.1.0 exists on npm but LACKS the
#    ./governance export + M3 Expressive springs). Bump to 2.2.0 first, then:
cd packages/design-core
npm publish --access public
#    NOTE: publishConfig access defaults; set publishConfig.access=public if not set.

# 4. governance (depends on @p31ca/design-core ≥2.2.0 with ./governance export)
cd packages/governance
npm publish --access public

# 5. agent-engine — ONLY after canon is on npm AND the TS5097 path is resolved
cd software/packages/agent-engine
npm publish --provenance --access public
```

> ⚠️ **Verified 2026-09-23:** the published `@p31ca/design-core@2.1.0` (npm
> `latest`, 31 exports) **lacks the `./governance` export and the M3
> Expressive springs** — those exist only in the workspace tree. So
> `@p31ca/governance` (which imports `@p31ca/design-core/governance` and `/tokens`)
> cannot ship until design-core is **bumped to 2.2.0 and republished** with the
> new exports. `npm publish` rewrites `workspace:*` refs to the registry
> version, so the published design-core must be the one carrying `./governance`.

## Before anyone sends outreach

Do NOT cite `@p31ca/canon` or `@p31ca/sovereign-primitives` as published until they return 200 on registry.npmjs.org. Verify with:

```bash
npm view @p31ca/canon version
npm view @p31ca/sovereign-primitives version
npm view @p31ca/agent-engine version
```

## Claims that must NOT appear (deleted this session)

- `draft-dembowski-agentledger-proof-of-behavior-00` — does not exist on the IETF datatracker (0 results). Deleted from README, PROOF-OF-BEHAVIOR.md, POSITIONING.md, GRANT-PIPELINE.md, MEATSPACE-RUNBOOK.md, both master prompts.
- `@p31ca/relay`, `@p31ca/portal` — no source dir; never cite.
- "IETF Proof-of-Behavior aligned" — replaced with verified drafts (AAT `draft-sharif-agent-audit-trail-04`, AIC-JWT `draft-wei-aic-jwt`, AIP `draft-prakash-aip`, MTAC `draft-burls-mtac`, WIMSE `draft-ietf-wimse-arch-08`).