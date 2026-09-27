# 26 — Fork Decision Matrix

Decision framework for ecosystem alignment. Each dimension asks: rewrite (specification-first, atomic change) or refactor (incremental, strangler fig)?

## Decision principles

- **Rewrite** if the conceptual model is wrong or the current state is too misaligned for incremental change to converge
- **Refactor** if the conceptual model is mostly right and drift accumulated over time
- **Specification-first** when there's no executable specification of the desired state
- **Parallel** when market timeline prevents serial execution

## Dimension 1: Design-core version split (2.3.0 vs 2.2.0)

| Signal | Rewrite | Refactor |
|---|---|---|
| Current state | 4 portals on 2.2.0, 3 on 2.3.0, template says 2.3.0 | Version drift managed by sync:vendor |
| Decision | **REFACTOR** — align 4 portals to 2.3.0 via sync:vendor + v:gate. The template already declares 2.3.0; these portals just need to regenerate vendor tarballs. No semantic change, version bump only. | |
| Action | children/teen/parent: `cd portal && pnpm sync:vendor && pnpm build && pnpm v:gate`. meatspace: regenerate design-core tarball (currently declared but not used — first decide if meatspace needs design-core at all). | |
| Parallel | Yes — each portal's vendor sync is independent | |
| Design track | Runs in parallel — VRT/token audit on each portal independently | |

## Dimension 2: QPJ dormant @p31 dependencies

QPJ declares 3 @p31 packages it never imports. Per family rule: not dead, needs rejuvenation.

### 2a: @p31ca/game-engine

| Signal | Rewrite | Refactor |
|---|---|---|
| Current state | Declared, never used. Family uses JitterbugGame in children/teen/parent. QPJ has spoons and energy but no game mechanics. | Document dormancy. Revisit when QPJ needs game features. |
| Decision | **REFACTOR** — document why QPJ doesn't need it now, with a clear trigger for adoption. If QPJ's workshop needs Jitterbug geometry, adopt specification-first (define game mechanics spec before code). | |
| Rejuvenation path | Option A: Adopt — add JitterbugGame to workshop, spec-first (what game mechanics does QPJ need?). Option B: Document — add entry to docs/15-DIVERGENCES explaining why QPJ doesn't use game-engine and what would trigger adoption. | |

### 2b: @p31ca/gamification

| Signal | Rewrite | Refactor |
|---|---|---|
| Current state | Declared, never used. Family uses sound/confetti/haptic/growth-rings. QPJ has Confetti + voice (partial overlap — QPJ's existing features cover some gamification surface). | Document dormancy with overlap analysis. |
| Decision | **REFACTOR** — QPJ's existing Confetti, voice, and LOVE ledger partially cover gamification's surface. Document the mapping: which gamification exports does QPJ already provide, which does it need, and which are intentionally out of scope. | |
| Rejuvenation path | Option A: Adopt — replace QPJ's custom Confetti with gamification/confetti, adopt sound/haptic subsystems. Option B: Document — map QPJ's existing features to gamification's exports, mark the gap as future work. | |

### 2c: @p31ca/ui

| Signal | Rewrite | Refactor |
|---|---|---|
| Current state | Declared, never used. Family uses passport/*, starfield, adaptive/GreyRock/NeuroAdapter. QPJ has custom Starfield, MeshBridge, ModeGuard, CrisisOverlay. | Document dormancy with replacement analysis. |
| Decision | **REFACTOR** — QPJ's custom implementations are intentional (family-specific look, security posture). Document which @p31/ui exports QPJ intentionally replaces and why. | |
| Rejuvenation path | Option A: Adopt GreyRock/NeuroAdapter (adaptive theming) if QPJ needs them. Option B: Adopt passport templates if QPJ's passport flow needs them. Option C: Document all current replacements with triggers. | |

## Dimension 3: meatspace misalignment

| Signal | Rewrite | Refactor |
|---|---|---|
| Current state | meatspace is the most misaligned portal: declares design-core but doesn't use it, declares game-engine/gamification but doesn't use them, uses ui/sovereign-core heavily. Its surfaces have no design-core token layer. | Treat as a reintegration project: bring meatspace back into the family design system incrementally. |
| Decision | **REFACTOR** — meatspace was likely built from the template then diverged. Re-integrate design-core first (highest impact), then decide on game-engine/gamification. | |
| Action | Phase 1: Investigate why meatspace dropped design-core. Is it intentional (different visual identity) or drift? Phase 2: If drift, re-adopt design-core via sync:vendor + token audit. Phase 3: Decide on game-engine/gamification (same decision as QPJ). | |
| Parallel | Yes — independent of QPJ's decisions. | |
| Design track | Runs in parallel — VRT/token audit on meatspace will reveal the current state. | |

## Dimension 4: Architectural paradigm split (SPA vs Astro)

| Signal | Rewrite | Refactor |
|---|---|---|
| Current state | 7 React SPAs (zustand, hash routing, design-core CSS) vs 2 Astro sites (Tailwind, no @p31 packages). They share zero technical infrastructure. | They are different products with different deployment models. Don't force convergence. |
| Decision | **REFACTOR** — define a shared design contract (tokens, components, voice) that both paradigms adhere to, without forcing one onto the other. | |
| Action | Define a "P31 design contract" spec: (1) token layer (how do Astro sites consume @p31ca/design-core tokens? Via Tailwind preset? Via CSS custom properties? Via DTCG?), (2) component contract (which components are shared across paradigms?), (3) brand voice / content alignment. | |
| Parallel | Yes — the contract definition is independent of portal-specific changes. | |
| Design track | Critical for this dimension — p31ca and phos need design alignment for market. | |

## Dimension 5: p31ca design alignment

| Signal | Rewrite | Refactor |
|---|---|---|
| Current state | Astro site using @p31/ui (chrome, webmcp), @p31/shell-chrome, @p31/shared-identity, @p31/shared (Tailwind preset). No @p31/design-core. Tailwind v3 with custom colors + shared preset. | Incremental — p31ca already has @p31 footprints. Expand them. |
| Decision | **REFACTOR** — p31ca is already partially aligned. Expand its @p31/design-core surface (tokens, compositions for marketing pages). | |
| Action | Phase 1: Verify @p31/shared tailwind preset covers design-core tokens. Phase 2: Add design-core token layer to p31ca's Tailwind pipeline. Phase 3: Adopt shared design-core components (Footer, Topbar, etc.) where they improve consistency. | |
| Design track | Runs in parallel — this IS a design track item. | |

## Dimension 6: phosphorus31 design alignment

| Signal | Rewrite | Refactor |
|---|---|---|
| Current state | Astro site using zero @p31 packages. Tailwind v4 with hardcoded hex colors (6 colors in config, plus inline). Institutional marketing site. | Incremental — phosphorus31 is the most disconnected from the ecosystem but is the public-facing brand site. |
| Decision | **REFACTOR** — phosphorus31 is the "cleaner warmer institutional version." It needs design tokens (not full design-core) for brand consistency across the family. | |
| Action | Phase 1: Extract phosphorus31's Tailwind colors into a token map. Phase 2: Align token palette with @p31/design-core (or define a parallel institutional palette that maps to design-core). Phase 3: Add @p31/design-core CSS tokens via Tailwind config if feasible. | |
| Design track | Runs in parallel — this IS a design track item. | |

## Dimension 7: Vendor tarbell governance

| Signal | Rewrite | Refactor |
|---|---|---|
| Current state | QPJ, chat, design use vendored design-core 2.3.0 tarballs. children/teen/parent use 2.2.0. meatspace doesn't use design-core at all. All use vendored sovereign-core (QPJ) or npm (others). All use vendored ui 1.3.1 (where used). | Keep the vendor tarball pattern — it works. The issue is version drift, not the pattern. |
| Decision | **REFACTOR** — sync:vendor to align versions. v:gate to verify. | |
| Action | All portals: ensure vendor tarballs match the latest canonical version. children/teen/parent: sync design-core to 2.3.0. meatspace: sync all vendors (or decide not to use them). | |

## Execution order (market timeline)

Given "everything all at once, they need it yesterday," the parallel execution plan:

### Wave 0 (immediate, no dependencies)
- [ ] Define P31 design contract spec (Dimension 4) — enables all other dimensions
- [ ] Sync vendor tarballs for children/teen/parent (Dimension 1) — independent per portal
- [ ] meatspace design-core investigation (Dimension 3) — independent
- [ ] p31ca token layer verification (Dimension 5) — independent
- [ ] phosphorus31 token extraction (Dimension 6) — independent

### Wave 1 (after Wave 0 decisions)
- [ ] QPJ dormant dep decisions (Dimension 2) — can start in parallel with Wave 0
- [ ] meatspace design-core re-adoption (Dimension 3 Phase 2) — after investigation
- [ ] p31ca design-core expansion (Dimension 5 Phase 2+) — after token verification
- [ ] phosphorus31 token alignment (Dimension 6 Phase 2+) — after extraction

### Wave 2 (after Wave 1)
- [ ] Full portal alignment verification (all portals: TC/LINT/TEST/BUILD/v:gate + design track)
- [ ] Cross-portal VRT alignment
- [ ] Cross-portal content/voice alignment

### Design track (runs in parallel throughout)
- [ ] VRT baselines across all portals
- [ ] Token linter integration (ds-drift or equivalent)
- [ ] Token-reconciler (needs DTCG token file from each portal)
- [ ] docs/24 (design system audit) per portal
