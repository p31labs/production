# Forge Portal — Boundaries

> The honest disclosure for the forge enterprise-MVP frontend. A claim is
> traceable; a boundary is stated. Both are required.

## What is verified (with the artifact that proves it)

| Claim | Proof |
|---|---|
| 46 content packs indexed | `pnpm manifest` → `src/data/manifest.json`, walked from the real forge content tree |
| API client matches the worker contract | `tests/unit/api.test.ts` (mock worker) + system-test Phase 2 |
| Store transitions correct | `tests/unit/store.test.ts` (7 tests) |
| No raw hex/rgba in `src/` | canonical `token-audit.mjs` with cwd = portal (system-test Phase 4) |
| The build produces a site | `pnpm build` → `dist/index.html` (system-test Phase 5) |
| Both gates can fail | `tests/acceptance/gate-self-test.mjs` → 2/2 proven; NCs emit `NEGATIVE_CONTROL_OK` |

## What is NOT yet done (explicitly, so no one over-reads)

- **Playwright baselines are pending.** `tests/acceptance/forge.spec.ts` exists but screenshots have not been generated and committed. `image-distinctness` is therefore **not** a BLOCKING gate; the `pending-baselines` ratchet in `domains/forge/constitution.json` tracks this (baseline 1).
- **Compile is read-only unless `VITE_FORGE_KEY` is set.** No secret is bundled. Real auth (token exchange from the workspace session) is future work, per the constitution's `aspirational[]`.
- **Multi-tenant + persistence are future work.** Org-scoped packs and D1-backed compile history are not wired.
- **The system test bundles two modules via esbuild** (`out/tmp-api.mjs`, `out/tmp-store.mjs`) for its node-side phases. This is a test harness detail, not the app path.

## Scope of the token-audit gate

The canonical token-audit scans the portal's `src/**` (it roots at `process.cwd()`). It does **not** scan `index.html`, `scripts/`, or config files. Keep color literals in `src/` only, or the gate's scope must be expanded when it is.

## Blast radius of the workspace change

`production/portals/forge` was added to `/home/p31/pnpm-workspace.yaml`. Sibling portals were **not** individually re-verified after install. Run `pnpm install` at the workspace root and spot-check a sibling portal's `pnpm typecheck` before relying on the shared lockfile.

## Verdict on the governance question

The forge portal is now a **governed domain** (`domains/forge/constitution.json`), the 6th in the enterprise stack, with an enforceable `documents-are-canonical` contract. The portal-local `gates.json` + meta-gate + NCs give it the same discipline as the design portal, and the drift check keeps the two registries honest.